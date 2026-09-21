import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { passwordResetTemplate } from "@/lib/email-templates";

export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  const { allowed } = await checkRateLimit(`forgot-password:${ip}`, 5, 60 * 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // Google-only accounts (no password yet) also get a link: completing it simply
  // adds password sign-in to an address they have just proven they control.
  if (user && !user.isBanned) {
    await prisma.verificationToken.deleteMany({ where: { identifier: `reset:${email}` } });
    const token = randomUUID();
    await prisma.verificationToken.create({
      data: { identifier: `reset:${email}`, token, expires: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const { subject, html } = passwordResetTemplate(user.name ?? "there", token, ip);
    await sendEmail({ to: email, subject, html });
  }

  // Same response whether or not the account exists, to avoid email enumeration.
  return NextResponse.json({ success: true, message: "If that email exists, a reset link has been sent." });
}
