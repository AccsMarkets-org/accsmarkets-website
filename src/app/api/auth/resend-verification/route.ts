import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { resendVerificationSchema } from "@/lib/validation/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import { sendEmail } from "@/lib/email";
import { emailVerifyTemplate } from "@/lib/email-templates";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = resendVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const { email } = parsed.data;

  const { allowed } = await checkRateLimit(
    `resend-verification:${email}`,
    RATE_LIMITS.RESEND_VERIFICATION.limit,
    RATE_LIMITS.RESEND_VERIFICATION.windowSeconds,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Please wait before requesting another email." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond success-shaped to avoid leaking which emails are registered.
  if (!user || user.emailVerified) {
    return NextResponse.json({ success: true });
  }

  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  const token = randomUUID();
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });

  const { subject, html } = emailVerifyTemplate(user.name ?? "there", token);
  await sendEmail({ to: email, subject, html });

  return NextResponse.json({ success: true });
}
