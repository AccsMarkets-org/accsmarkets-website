import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation/auth";
import { verifyCaptcha } from "@/lib/hcaptcha";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import { sendEmail } from "@/lib/email";
import { emailVerifyTemplate } from "@/lib/email-templates";
import { upsertRiskScore } from "@/lib/risk";

export async function POST(req: Request) {
  // Basic CSRF protection: reject cross-origin POSTs. Browsers always send the
  // Origin header for cross-origin requests; same-origin requests and server-
  // side calls may omit it, which we allow through (rate-limiting handles abuse).
  const origin = req.headers.get("origin");
  if (origin) {
    const expectedOrigin = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
    if (origin !== expectedOrigin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const ip = getClientIp(req.headers);
  const { allowed } = await checkRateLimit(
    `register:${ip}`,
    RATE_LIMITS.REGISTRATION.limit,
    RATE_LIMITS.REGISTRATION.windowSeconds,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Try again later." },
      { status: 429 },
    );
  }

  const settings = await prisma.platformSettings.findUnique({ where: { id: "singleton" } }).catch(() => null);
  if (settings && !settings.registrationOpen) {
    return NextResponse.json({ error: "Registration is currently closed." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { name, email, password, captchaToken, refCode, intent } = parsed.data;

  const captchaOk = await verifyCaptcha(captchaToken);
  if (!captchaOk) {
    return NextResponse.json({ error: "Captcha verification failed" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const freePlan = await prisma.subscriptionPlan.findUnique({ where: { name: "FREE" } });
  const hashedPassword = await bcrypt.hash(password, 12);
  const username = await generateUniqueUsername(email);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      username,
      subscriptionPlanId: freePlan?.id,
      ...(intent === "BUY" ? { primaryIntent: "BUYER" } :
          intent === "SELL" ? { primaryIntent: "SELLER" } :
          intent === "BOTH" ? { primaryIntent: "BOTH" } : {}),
    },
  });

  const token = randomUUID();
  await prisma.verificationToken.create({
    data: {
      identifier: user.email,
      token,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const { subject, html } = emailVerifyTemplate(user.name ?? "there", token);
  await sendEmail({ to: user.email, subject, html });

  // Referral attribution: record the referral as PENDING (reward granted at 10-invite milestone via sweep).
  if (refCode) {
    try {
      const referralCode = await prisma.referralCode.findUnique({ where: { code: refCode } });
      if (referralCode && referralCode.userId !== user.id) {
        await prisma.referral.create({
          data: {
            referrerId: referralCode.userId,
            refereeId: user.id,
            referralCodeId: referralCode.id,
            status: "PENDING",
          },
        });
      }
    } catch {
      // Non-fatal: don't block registration if referral tracking fails
    }
  }

  void upsertRiskScore(user.id);

  return NextResponse.json({ success: true, message: "Check your email to verify your account." });
}

async function generateUniqueUsername(seed: string): Promise<string> {
  const base = seed.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "user";
  let candidate = base;
  let suffix = 0;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
  return candidate;
}
