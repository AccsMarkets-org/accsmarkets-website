import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyEmailSchema } from "@/lib/validation/auth";
import { sendEmail } from "@/lib/email";
import { welcomeTemplate } from "@/lib/email-templates";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({ where: { token: parsed.data.token } });
  if (!record) {
    return NextResponse.json({ error: "This verification link is invalid or already used." }, { status: 400 });
  }
  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token: record.token } }).catch(() => {});
    return NextResponse.json({ error: "This verification link has expired." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: record.identifier } });
  if (!user) {
    return NextResponse.json({ error: "No account found for this link." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        // Email verification is the first KYC level.
        ...(user.kycLevel === "NONE" && { kycLevel: "EMAIL" }),
      },
    }),
    prisma.verificationToken.delete({ where: { token: record.token } }),
  ]);

  if (user.email) {
    const tpl = welcomeTemplate(user.name ?? "there");
    sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html, slug: "welcome" }).catch(() => null);
  }

  // Lazy-create official support welcome message (fire-and-forget).
  prisma.platformSettings
    .findUnique({ where: { id: "singleton" }, select: { officialSupportUserId: true } })
    .then(async (settings) => {
      if (!settings?.officialSupportUserId) return;
      const supportId = settings.officialSupportUserId;
      const convId = [user.id, supportId].sort().join("_");
      const existing = await prisma.message.findFirst({ where: { conversationId: convId } });
      if (!existing) {
        await prisma.message.create({
          data: {
            conversationId: convId,
            senderId: supportId,
            recipientId: user.id,
            content:
              "Welcome to AccsMarkets! I'm your dedicated support agent. Feel free to ask me " +
              "anything about escrow, buying, selling, or your account. I typically respond within a few hours.",
          },
        });
      }
    })
    .catch(() => null);

  return NextResponse.json({ success: true });
}
