import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { sendEmail } from "@/lib/email";
import { contactReplyTemplate } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const schema = z.object({
  body: z.string().trim().min(10).max(5000),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const message = await prisma.contactMessage.findUnique({ where: { id: params.id } });
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const tpl = contactReplyTemplate(message.name, message.subject, parsed.data.body);
  await sendEmail({ to: message.email, subject: tpl.subject, html: tpl.html });

  await prisma.contactMessage.update({
    where: { id: message.id },
    data: { isRead: true, readAt: message.readAt ?? new Date() },
  });

  await auditLog(prisma, session.user.id, "contact_message.reply", "ContactMessage", message.id, {
    to: message.email,
  });

  return NextResponse.json({ success: true });
}
