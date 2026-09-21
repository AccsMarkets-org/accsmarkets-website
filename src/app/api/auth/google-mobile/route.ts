import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isPendingSecret } from "@/lib/totp";

type GooglePayload = {
  iss?: string;
  aud?: string;
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean | string;
};

export async function POST(req: Request) {
  const isMobile = req.headers.get("x-mobile-client") === "1";
  if (!isMobile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ip = getClientIp(req.headers);
  const { allowed } = await checkRateLimit(`google-mobile:${ip}`, 10, 15 * 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const idToken: unknown = body?.idToken;

  // Only ID tokens are accepted. A bare access token can't be bound to our
  // OAuth client — any third-party app's Google access token for the victim
  // would otherwise log in as them here.
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const expectedAudience = process.env.GOOGLE_CLIENT_ID;
  if (!expectedAudience) {
    return NextResponse.json({ error: "Google sign-in is not configured" }, { status: 503 });
  }

  let googlePayload: GooglePayload;
  try {
    // Verify Google ID token via tokeninfo endpoint (checks signature + expiry)
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!r.ok) throw new Error("Invalid ID token");
    googlePayload = await r.json();

    // The token must have been issued to OUR client, by Google.
    if (googlePayload.aud !== expectedAudience) throw new Error("Invalid audience");
    if (googlePayload.iss !== "accounts.google.com" && googlePayload.iss !== "https://accounts.google.com") {
      throw new Error("Invalid issuer");
    }

    if (!googlePayload.email_verified || googlePayload.email_verified === "false") {
      throw new Error("Email not verified");
    }
    if (!googlePayload.email) throw new Error("No email in token");
  } catch {
    return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email: googlePayload.email },
    select: {
      id: true, name: true, email: true, username: true, image: true,
      role: true, kycLevel: true, verifiedBadge: true,
      walletBalance: true, trustScore: true, isBanned: true, createdAt: true,
    },
  });

  if (!user) {
    const base = googlePayload.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
    let username = base;
    let suffix = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${base}${suffix++}`;
    }
    user = await prisma.user.create({
      data: {
        email: googlePayload.email,
        name: googlePayload.name ?? null,
        image: googlePayload.picture ?? null,
        username,
        kycLevel: "EMAIL",
        emailVerified: new Date(),
      },
      select: {
        id: true, name: true, email: true, username: true, image: true,
        role: true, kycLevel: true, verifiedBadge: true,
        walletBalance: true, trustScore: true, isBanned: true, createdAt: true,
      },
    });
  }

  if ((user as any).isBanned) {
    return NextResponse.json({ error: "Your account has been suspended" }, { status: 403 });
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
    token: { sub: user.id, id: user.id, name: user.name, email: user.email, image: user.image, role: user.role },
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      image: user.image,
      role: user.role,
      kycLevel: user.kycLevel,
      verifiedBadge: user.verifiedBadge,
      walletBalance: user.walletBalance.toString(),
      trustScore: user.trustScore,
      isBanned: (user as any).isBanned,
      createdAt: user.createdAt.toISOString(),
    },
  });
}
