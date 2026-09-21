import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { passwordChangedTemplate } from "@/lib/email-templates";

export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  const { allowed } = await checkRateLimit(`reset-password:${ip}`, 5, 15 * 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { token, password } = parsed.data;

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || !record.identifier.startsWith("reset:")) {
    return NextResponse.json({ error: "This reset link is invalid or already used." }, { status: 400 });
  }
  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return NextResponse.json({ error: "This reset link has expired." }, { status: 400 });
  }

  const email = record.identifier.replace("reset:", "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "No account found for this link." }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } }),
    prisma.verificationToken.delete({ where: { token } }),
    // Failed guesses are usually why they reset; don't leave them locked out of the new password.
    prisma.loginAttempt.deleteMany({ where: { email: user.email, success: false } }),
  ]);

  // Tell the account owner — if this reset wasn't them, this is their only signal.
  const tpl = passwordChangedTemplate(user.name ?? "there");
  sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html }).catch(() => null);

  return NextResponse.json({ success: true });
}
