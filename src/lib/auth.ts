import type { NextAuthOptions } from "next-auth";
import type { AuthenticationResponseJSON, AuthenticatorTransportFuture } from "@simplewebauthn/types";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { prisma } from "@/lib/db";
import { decryptSecret, verifyCode } from "@/lib/totp";
import { rpID, origin as webauthnOrigin, getChallengeCookie, clearChallengeCookie } from "@/lib/webauthn";
import { sendEmail } from "@/lib/email";
import { loginAlertTemplate } from "@/lib/email-templates";
import { createNotification, wantsEmail } from "@/lib/notifications";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

type AuthorizeHeaders = Record<string, unknown> | undefined;

function headerValue(headers: AuthorizeHeaders, name: string): string {
  const raw = headers?.[name];
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return typeof raw === "string" ? raw : "";
}

// Same precedence as getClientIp() in src/lib/rate-limit.ts, but NextAuth hands
// authorize() a plain lower-cased header object rather than a Headers instance.
// Restricted to IP characters — the value is client-influenced and ends up in
// an email template that does no HTML escaping.
function clientIpFrom(headers: AuthorizeHeaders): string {
  const forwarded = headerValue(headers, "x-forwarded-for").split(",")[0].trim();
  const ip = (forwarded || headerValue(headers, "x-real-ip").trim()).replace(/[^0-9a-fA-F:.]/g, "").slice(0, 45);
  return ip || "unknown";
}

// Whitelisted "Browser on OS" summary — the raw user-agent is never echoed.
function summarizeUserAgent(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : /okhttp|Expo|Dalvik|CFNetwork/i.test(ua) ? "Mobile app"
    : "Unknown browser";
  const os = /Windows/.test(ua) ? "Windows"
    : /Android/.test(ua) ? "Android"
    : /iPhone|iPad|iOS/.test(ua) ? "iOS"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : "unknown device";
  return `${browser} on ${os}`;
}

// New-IP sign-in detection. "New" = the account has signed in successfully
// before from at least one known IP, and never from this one. Rows written
// before real IPs were recorded carry ip "unknown" and are ignored, so the first
// login after that change doesn't alert every existing user. Must run BEFORE the
// current attempt's success row is written. Never throws.
async function isNewIpLogin(email: string, ip: string): Promise<boolean> {
  try {
    if (ip === "unknown") return false;
    const [knownIpLogins, sameIpLogins] = await Promise.all([
      prisma.loginAttempt.count({ where: { email, success: true, ip: { not: "unknown" } } }),
      prisma.loginAttempt.count({ where: { email, success: true, ip } }),
    ]);
    return knownIpLogins > 0 && sameIpLogins === 0;
  } catch {
    return false;
  }
}

// Best-effort SECURITY notification + login-alert email. Called without await —
// an alert failure must never block or delay a valid login.
async function sendNewIpAlert(
  user: { id: string; email: string; name: string | null },
  ip: string,
  headers: AuthorizeHeaders,
): Promise<void> {
  try {
    const device = summarizeUserAgent(headerValue(headers, "user-agent"));
    const country = (headerValue(headers, "cf-ipcountry") || headerValue(headers, "x-vercel-ip-country"))
      .replace(/[^A-Za-z]/g, "")
      .slice(0, 2)
      .toUpperCase();
    const loginAt = new Date().toUTCString();

    await createNotification({
      userId: user.id,
      type: "SECURITY",
      title: "New sign-in to your account",
      body: `${device} signed in from a new IP address (${ip}). If this wasn't you, change your password and review your sessions.`,
      link: "/dashboard/settings/sessions",
    });

    if (await wantsEmail(user.id, "SECURITY")) {
      const tpl = loginAlertTemplate(user.name ?? "there", device, ip, country || "Not available", loginAt);
      sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html }).catch(() => null);
    }
  } catch {
    // swallowed — see above
  }
}

const useSecureCookies = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: {
    signIn: "/login",
  },
  // The admin panel lives on admin.accsmarkets.org, a separate host from the
  // main site — NextAuth's default cookies have no Domain attribute, so
  // they're host-only and don't reliably persist across that split (this is
  // very likely the "keeps asking me to log in again" report). Sharing them
  // across *.accsmarkets.org fixes it.
  //
  // csrfToken is deliberately left untouched: NextAuth names it with the
  // __Host- prefix when secure, and __Host- cookies are spec-forbidden from
  // carrying a Domain attribute at all — the browser silently drops the
  // whole Set-Cookie header if you try, which would break sign-in
  // everywhere, not just admin. It doesn't need cross-subdomain sharing
  // anyway: the CSRF token is set and read back within the same login page
  // load, always on the same host.
  cookies: {
    sessionToken: {
      name: `${useSecureCookies ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        domain: useSecureCookies ? ".accsmarkets.org" : undefined,
      },
    },
    callbackUrl: {
      name: `${useSecureCookies ? "__Secure-" : ""}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        domain: useSecureCookies ? ".accsmarkets.org" : undefined,
      },
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("MISSING_CREDENTIALS");
        }

        const ip = clientIpFrom(req?.headers);

        const email = credentials.email.toLowerCase().trim();
        const windowStart = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000);

        // Check lockout before hitting the DB for the user.
        const recentFailures = await prisma.loginAttempt.count({
          where: { email, success: false, createdAt: { gte: windowStart } },
        });
        if (recentFailures >= MAX_LOGIN_ATTEMPTS) {
          throw new Error("ACCOUNT_LOCKED");
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.password) {
          await prisma.loginAttempt.create({ data: { email, ip, success: false } });
          throw new Error("INVALID_CREDENTIALS");
        }

        if (user.isBanned) {
          throw new Error("ACCOUNT_BANNED");
        }

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) {
          await prisma.loginAttempt.create({ data: { email, ip, success: false } });
          const newFailures = recentFailures + 1;
          const remaining = MAX_LOGIN_ATTEMPTS - newFailures;
          if (remaining <= 0) throw new Error("ACCOUNT_LOCKED");
          throw new Error(`INVALID_CREDENTIALS:${remaining}`);
        }

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // Check if 2FA is enabled — if so, require a valid totp code passed as the
        // special field `totpCode` in the credentials object. Enforced for every
        // role, including ADMIN — a previous version of this check exempted admins
        // entirely, which meant a leaked admin password bypassed 2FA outright.
        //
        // A row whose secret still carries the PENDING: marker is a setup the user
        // started but never confirmed with a code — it must not gate login, or an
        // abandoned setup locks the account out. decryptSecret throws on an
        // unreadable secret, which fails the login (closed), never skips the check.
        const tfa = await prisma.twoFactorAuth.findUnique({ where: { userId: user.id } });
        const tfaSecret = tfa ? decryptSecret(tfa.secret) : "";
        if (tfa && !tfaSecret.startsWith("PENDING:")) {
          const totpCode = (credentials as Record<string, string>).totpCode ?? "";
          if (!totpCode) {
            throw new Error("TOTP_REQUIRED");
          }
          // Check backup codes first.
          const codes: string[] = JSON.parse(tfa.backupCodes);
          let usedBackup = false;
          for (let i = 0; i < codes.length; i++) {
            if (await bcrypt.compare(totpCode, codes[i])) {
              codes.splice(i, 1); // single-use
              await prisma.twoFactorAuth.update({
                where: { userId: user.id },
                data: { backupCodes: JSON.stringify(codes) },
              });
              usedBackup = true;
              break;
            }
          }
          if (!usedBackup && !verifyCode(tfaSecret, totpCode)) {
            // Count a wrong code as a failed login so the 5-per-15-min lockout
            // above also covers TOTP guessing.
            await prisma.loginAttempt.create({ data: { email, ip, success: false } });
            throw new Error("INVALID_TOTP");
          }
        }

        const newIp = await isNewIpLogin(email, ip);
        await prisma.loginAttempt.create({ data: { email, ip, success: true } });
        if (newIp) void sendNewIpAlert(user, ip, req?.headers);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
    // Face ID / Touch ID / platform-passkey sign-in for the admin panel. The
    // actual cryptographic verification happens here, server-side — the
    // client only ever sends back the signed assertion, never anything
    // secret. Reuses the same JWT/session issuance as password login below,
    // so everything downstream (cookies, role, session callbacks) is
    // identical either way.
    CredentialsProvider({
      id: "webauthn",
      name: "Face ID",
      credentials: {
        email: { label: "Email", type: "email" },
        credential: { label: "Credential", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.credential) {
          throw new Error("MISSING_CREDENTIALS");
        }

        const ip = clientIpFrom(req?.headers);

        const challenge = getChallengeCookie();
        if (!challenge) throw new Error("CHALLENGE_EXPIRED");

        const email = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw new Error("INVALID_CREDENTIALS");
        if (user.isBanned) throw new Error("ACCOUNT_BANNED");

        let assertion: AuthenticationResponseJSON;
        try {
          assertion = JSON.parse(credentials.credential);
        } catch {
          throw new Error("INVALID_CREDENTIALS");
        }

        const stored = await prisma.webAuthnCredential.findUnique({
          where: { credentialId: assertion.id },
        });
        if (!stored || stored.userId !== user.id) throw new Error("INVALID_CREDENTIALS");

        let verification;
        try {
          verification = await verifyAuthenticationResponse({
            response: assertion,
            expectedChallenge: challenge,
            expectedOrigin: webauthnOrigin,
            expectedRPID: rpID,
            authenticator: {
              credentialID: isoBase64URL.toBuffer(stored.credentialId),
              credentialPublicKey: isoBase64URL.toBuffer(stored.publicKey),
              counter: Number(stored.counter),
              transports: stored.transports
                ? (stored.transports.split(",") as AuthenticatorTransportFuture[])
                : undefined,
            },
          });
        } catch {
          throw new Error("INVALID_CREDENTIALS");
        }
        if (!verification.verified) throw new Error("INVALID_CREDENTIALS");

        clearChallengeCookie();
        await prisma.webAuthnCredential.update({
          where: { id: stored.id },
          data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() },
        });
        await prisma.loginAttempt.create({ data: { email, ip, success: true } });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        // By the time this callback runs, PrismaAdapter has already created/linked the DB row.
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (!dbUser) return true;
        if (dbUser.isBanned) return false;

        // Google-verified emails are trusted — auto-verify, and backfill a username +
        // default plan for brand-new accounts (the adapter doesn't set these).
        if (!dbUser.emailVerified || !dbUser.username || !dbUser.subscriptionPlanId) {
          const username = dbUser.username ?? (await generateUniqueUsername(dbUser.email));
          const freePlan = dbUser.subscriptionPlanId
            ? null
            : await prisma.subscriptionPlan.findUnique({ where: { name: "FREE" } });
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              emailVerified: dbUser.emailVerified ?? new Date(),
              kycLevel: dbUser.kycLevel === "NONE" ? "EMAIL" : dbUser.kycLevel,
              username,
              subscriptionPlanId: dbUser.subscriptionPlanId ?? freePlan?.id,
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
      }
      if (trigger === "update" || !token.role) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });
        if (dbUser) {
          token.role = dbUser.role;
          token.kycLevel = dbUser.kycLevel;
          token.verifiedBadge = dbUser.verifiedBadge;
          token.picture = dbUser.image ?? token.picture;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.image = (token.picture as string | null | undefined) ?? session.user.image;
        (session.user as Record<string, unknown>).kycLevel = token.kycLevel;
        (session.user as Record<string, unknown>).verifiedBadge = token.verifiedBadge;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

async function generateUniqueUsername(seed: string): Promise<string> {
  const base =
    seed
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20) || "user";

  let candidate = base;
  let suffix = 0;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
  return candidate;
}
