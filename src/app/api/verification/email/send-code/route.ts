import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";
import { otpCodeTemplate } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const RESEND_COOLDOWN_MS = 60 * 1000;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userEmail = session.user.email;
  if (!userEmail) return NextResponse.json({ error: "Account has no email address" }, { status: 422 });

  // Rate-limit
  const existing = await prisma.emailOtpVerification.findUnique({ where: { userId: session.user.id } });
  if (existing && !existing.verifiedAt) {
    const age = Date.now() - new Date(existing.createdAt).getTime();
    if (age < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - age) / 1000);
      return NextResponse.json({ error: `Please wait ${waitSec}s before requesting a new code` }, { status: 429 });
    }
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.emailOtpVerification.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, codeHash, expiresAt },
    // createdAt drives the resend cooldown above, so it must move with each new code.
    update: { codeHash, expiresAt, verifiedAt: null, createdAt: new Date() },
  });

  const tpl = otpCodeTemplate(code);
  const delivered = await sendEmail({ to: userEmail, subject: tpl.subject, html: tpl.html });
  if (!delivered) {
    return NextResponse.json(
      { error: "We couldn't send the verification email right now. Please try again in a few minutes." },
      { status: 502 },
    );
  }

  return NextResponse.json({ sent: true });
}
