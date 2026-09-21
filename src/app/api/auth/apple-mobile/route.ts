import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isPendingSecret } from "@/lib/totp";

// Apple's public signing keys. jose caches the key set and refetches on an
// unknown `kid`, so this is safe to keep at module scope.
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_AUDIENCE = "com.accsmarkets.app";

const userSelect = {
  id: true, name: true, email: true, username: true, image: true,
  role: true, kycLevel: true, verifiedBadge: true,
  walletBalance: true, trustScore: true, isBanned: true, createdAt: true,
} as const;

export async function POST(req: Request) {
  const isMobile = req.headers.get("x-mobile-client") === "1";
  if (!isMobile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ip = getClientIp(req.headers);
  const { allowed } = await checkRateLimit(`apple-mobile:${ip}`, 10, 15 * 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const { identityToken, fullName } = body ?? {};

  if (!identityToken || typeof identityToken !== "string") {
    return NextResponse.json({ error: "Missing identity token" }, { status: 400 });
  }

  // Cryptographically verify the token against Apple's JWKS — signature,
  // issuer, audience and expiry. Nothing from the token is trusted before this.
  let appleUserId: string;
  let verifiedEmail: string | null = null;
  try {
    const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
      issuer: APPLE_ISSUER,
      audience: APPLE_AUDIENCE,
    });
    if (!payload.sub) throw new Error("Missing Apple user ID");
    appleUserId = payload.sub;

    const emailVerified = payload.email_verified === true || payload.email_verified === "true";
    if (typeof payload.email === "string" && payload.email) {
      if (!emailVerified) throw new Error("Email not verified");
      verifiedEmail = payload.email.toLowerCase().trim();
    }
  } catch {
    return NextResponse.json({ error: "Invalid Apple token" }, { status: 401 });
  }

  // Resolve the user: first by the linked Apple account (covers sign-ins where
  // Apple omits the email claim), then by the VERIFIED email from the token.
  // A client-supplied email is never trusted — it would let anyone with a valid
  // Apple token sign in as an arbitrary account.
  const linked = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: "apple", providerAccountId: appleUserId } },
    select: { user: { select: userSelect } },
  });
  let user = linked?.user ?? null;

  if (!user) {
    if (!verifiedEmail) {
      return NextResponse.json(
        { error: "Email not available. Please sign out of Apple ID and try again." },
        { status: 400 }
      );
    }
    const email = verifiedEmail;

    user = await prisma.user.findUnique({ where: { email }, select: userSelect });

    if (!user) {
      const displayName = fullName
        ? [fullName.givenName, fullName.familyName].filter(Boolean).join(" ")
        : null;
      const base = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "user";
      let username = base;
      let suffix = 1;
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${base}${suffix++}`;
      }
      user = await prisma.user.create({
        data: {
          email,
          name: displayName,
          username,
          kycLevel: "EMAIL",
          emailVerified: new Date(),
        },
        select: userSelect,
      });
    }

    // Link the Apple ID so later sign-ins (where the email claim may be absent)
    // resolve to this user without relying on anything the client sends.
    await prisma.account
      .create({
        data: { userId: user.id, type: "oauth", provider: "apple", providerAccountId: appleUserId },
      })
      .catch(() => null);
  }

  if (user.isBanned) {
    return NextResponse.json({ error: "Your account has been suspended." }, { status: 403 });
  }

  // Social sign-in has no TOTP step, so it must not be a way around 2FA.
  const tfa = await prisma.twoFactorAuth.findUnique({ where: { userId: user.id }, select: { secret: true } });
  if (user.role === "ADMIN" || (tfa && !isPendingSecret(tfa.secret))) {
    return NextResponse.json(
      { error: "This account requires password sign-in with a 2FA code.", code: "PASSWORD_LOGIN_REQUIRED" },
      { status: 403 },
    );
  }

  const token = await encode({
    token: {
      sub: user.id, id: user.id, name: user.name,
      email: user.email, image: user.image, role: user.role,
    },
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({
    token,
    user: {
      id: user.id, name: user.name, email: user.email, username: user.username,
      image: user.image, role: user.role, kycLevel: user.kycLevel,
      verifiedBadge: user.verifiedBadge,
      walletBalance: user.walletBalance.toString(),
      trustScore: user.trustScore,
      isBanned: user.isBanned,
      createdAt: user.createdAt.toISOString(),
    },
  });
}
