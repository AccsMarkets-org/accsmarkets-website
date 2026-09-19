import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/db";

function decodeAppleJWT(identityToken: string) {
  const parts = identityToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  // Base64url decode the payload
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));
}

export async function POST(req: Request) {
  const isMobile = req.headers.get("x-mobile-client") === "1";
  if (!isMobile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const { identityToken, email: providedEmail, fullName } = body ?? {};

  if (!identityToken) {
    return NextResponse.json({ error: "Missing identity token" }, { status: 400 });
  }

  let applePayload: Record<string, string>;
  try {
    applePayload = decodeAppleJWT(identityToken);
    if (applePayload.iss !== "https://appleid.apple.com") {
      throw new Error("Invalid issuer");
    }
    if (applePayload.aud !== "com.accsmarkets.app") {
      throw new Error("Invalid audience");
    }
    if (!applePayload.sub) throw new Error("Missing Apple user ID");
  } catch {
    return NextResponse.json({ error: "Invalid Apple token" }, { status: 401 });
  }

  const appleUserId = applePayload.sub;
  // Apple only sends email on first sign-in; use stored email on subsequent ones
  const email = applePayload.email || providedEmail;

  if (!email) {
    return NextResponse.json(
      { error: "Email not available. Please sign out of Apple ID and try again." },
      { status: 400 }
    );
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true, name: true, email: true, username: true, image: true,
      role: true, kycLevel: true, verifiedBadge: true,
      walletBalance: true, trustScore: true, isBanned: true, createdAt: true,
    },
  });

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
      select: {
        id: true, name: true, email: true, username: true, image: true,
        role: true, kycLevel: true, verifiedBadge: true,
        walletBalance: true, trustScore: true, isBanned: true, createdAt: true,
      },
    });
  }

  if ((user as any).isBanned) {
    return NextResponse.json({ error: "Your account has been suspended." }, { status: 403 });
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
      isBanned: (user as any).isBanned,
      createdAt: user.createdAt.toISOString(),
    },
  });
}
