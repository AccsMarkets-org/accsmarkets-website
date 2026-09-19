import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { conversationId, emitToUser } from "@/lib/socket";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { newMessageTemplate } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const schema = z.object({
  message: z.string().trim().min(1, "Message is required").max(2000),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminId = session.user.id;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, name: true, username: true },
  });
  if (!recipient) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const msg = await prisma.message.create({
    data: {
      conversationId: conversationId(adminId, recipient.id),
      senderId: adminId,
      recipientId: recipient.id,
      content: parsed.data.message,
      moderationFlagged: false,
    },
    include: { sender: { select: { id: true, username: true, name: true, image: true } } },
  });

  emitToUser(recipient.id, "new_message", { message: msg });

  await createNotification({
    userId: recipient.id,
    type: "MESSAGE",
    title: "Message from AccsMarkets Support",
    body: parsed.data.message.slice(0, 80),
    link: `/dashboard/messages/${adminId}`,
  });

  if (recipient.email) {
    const senderName = msg.sender.username ?? msg.sender.name ?? "AccsMarkets Support";
    const recipientName = recipient.name ?? recipient.username ?? "there";
    const tpl = newMessageTemplate(recipientName, senderName, parsed.data.message.slice(0, 120));
    sendEmail({ to: recipient.email, subject: tpl.subject, html: tpl.html }).catch(() => null);
  }

  await auditLog(prisma, adminId, "admin_message_sent", "USER", recipient.id).catch(() => null);

  return NextResponse.json({ ok: true });
}
