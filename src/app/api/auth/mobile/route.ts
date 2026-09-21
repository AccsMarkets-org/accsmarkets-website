import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/db";
import { decryptSecret, verifyCode } from "@/lib/totp";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().optional(),
});

// Mobile-specific login endpoint: validates credentials, returns a NextAuth-compatible
// JWT that the mobile app stores and sends as the next-auth.session-token cookie.
export async function POST(req: Request) {
  const isMobile = req.headers.get("x-mobile-client") === "1";
  if (!isMobile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(req.headers);
  const { allowed } = await checkRateLimit(`mobile-login:${ip}`, 10, 15 * 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email: rawEmail, password, totpCode } = parsed.data;
  const email = rawEmail.toLowerCase().trim();

  // Brute-force protection — same window as web auth
  const windowStart = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000);
  const recentFailures = await prisma.loginAttempt.count({
    where: { email, success: false, createdAt: { gte: windowStart } },
  });
  if (recentFailures >= MAX_LOGIN_ATTEMPTS) {
    return NextResponse.json({ error: "Account temporarily locked. Try again in 15 minutes." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true, name: true, email: true, username: true, image: true,
      password: true, role: true, kycLevel: true, verifiedBadge: true,
      walletBalance: true, trustScore: true, isBanned: true,
      emailVerified: true, createdAt: true,
    },
  });

  if (!user || !user.password) {
    await prisma.loginAttempt.create({ data: { email, ip: "mobile", success: false } });
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (user.isBanned) {
    return NextResponse.json({ error: "Your account has been suspended" }, { status: 403 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    await prisma.loginAttempt.create({ data: { email, ip: "mobile", success: false } });
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (!user.emailVerified) {
    return NextResponse.json({ error: "Please verify your email address before logging in." }, { status: 403 });
  }

  // 2FA check — enforced for every role, including ADMIN (same as src/lib/auth.ts).
  // A row whose secret still carries the PENDING: marker is an unconfirmed setup
  // and does not count as 2FA being on.
  const tfa = await prisma.twoFactorAuth.findUnique({ where: { userId: user.id } });
  let tfaSecret = "";
  if (tfa) {
    try {
      tfaSecret = decryptSecret(tfa.secret);
    } catch {
      // Undecryptable secret — fail closed rather than skipping the 2FA check.
      return NextResponse.json({ error: "2FA could not be verified. Please contact support." }, { status: 401 });
    }
  }
  if (tfa && !tfaSecret.startsWith("PENDING:")) {
    if (!totpCode) {
      return NextResponse.json({ error: "2FA code required", code: "TOTP_REQUIRED" }, { status: 401 });
    }
    const codes: string[] = JSON.parse(tfa.backupCodes);
    let usedBackup = false;
    for (let i = 0; i < codes.length; i++) {
      if (await bcrypt.compare(totpCode, codes[i])) {
        codes.splice(i, 1);
        await prisma.twoFactorAuth.update({ where: { userId: user.id }, data: { backupCodes: JSON.stringify(codes) } });
        usedBackup = true;
        break;
      }
    }
    if (!usedBackup && !verifyCode(tfaSecret, totpCode)) {
      await prisma.loginAttempt.create({ data: { email, ip: "mobile", success: false } });
      return NextResponse.json({ error: "Invalid 2FA code", code: "INVALID_TOTP" }, { status: 401 });
    }
  }

  await prisma.loginAttempt.create({ data: { email, ip: "mobile", success: true } });

  // Encode a NextAuth-compatible JWT so the mobile app can use it as a session cookie
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      kycLevel: user.kycLevel,
      verifiedBadge: user.verifiedBadge,
    },
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: 60 * 60 * 24 * 7, // 7 days — same as web session
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
      isBanned: user.isBanned,
      createdAt: user.createdAt.toISOString(),
    },
  });
}
