import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/db";

type GooglePayload = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean | string;
};

export async function POST(req: Request) {
  const isMobile = req.headers.get("x-mobile-client") === "1";
  if (!isMobile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const idToken: string | undefined = body?.idToken;
  const accessToken: string | undefined = body?.accessToken;

  if (!idToken && !accessToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  let googlePayload: GooglePayload;
  try {
    if (idToken) {
      // Verify Google ID token via tokeninfo endpoint
      const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (!r.ok) throw new Error("Invalid ID token");
      googlePayload = await r.json();
    } else {
      // Verify access token via userinfo endpoint
      const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!r.ok) throw new Error("Invalid access token");
      googlePayload = await r.json();
      // userinfo only returns data for verified Google accounts
      googlePayload.email_verified = true;
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
