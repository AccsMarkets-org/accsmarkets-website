import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { sanitizeText } from "@/lib/sanitize";
import { attachmentsSchema, notifyUserOfStaffReply } from "@/app/api/support/_shared";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const schema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty").max(8000),
  isInternal: z.boolean().optional().default(false),
  attachments: attachmentsSchema,
});

/**
 * POST /api/admin/support/tickets/[id]/messages
 * Public reply  → status AWAITING_USER, lastReplyAt = now, user notified (in-app + email).
 * Internal note → stored with isInternal, no status change, user never sees it.
 * Replying auto-assigns an unassigned ticket to the replying staff member.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const body = sanitizeText(parsed.data.body);
  if (!body) return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  const attachments = parsed.data.attachments ?? [];
  const isInternal = parsed.data.isInternal;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    select: { id: true, number: true, subject: true, userId: true, status: true, assigneeId: true },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const now = new Date();
  const ticketUpdate: Prisma.SupportTicketUpdateInput = {};
  if (!isInternal) {
    ticketUpdate.status = "AWAITING_USER";
    ticketUpdate.lastReplyAt = now;
    ticketUpdate.resolvedAt = null;
  }
  if (!ticket.assigneeId) ticketUpdate.assignee = { connect: { id: session.user.id } };

  const [message] = await prisma.$transaction([
    prisma.supportTicketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: session.user.id,
        isStaff: true,
        isInternal,
        body,
        attachments: (attachments.length > 0 ? attachments : undefined) as Prisma.InputJsonValue | undefined,
      },
      include: { author: { select: { id: true, name: true, username: true, image: true } } },
    }),
    ...(Object.keys(ticketUpdate).length > 0
      ? [prisma.supportTicket.update({ where: { id: ticket.id }, data: ticketUpdate })]
      : []),
  ]);

  if (!isInternal) {
    await notifyUserOfStaffReply(ticket, body);
  }

  return NextResponse.json({ message, status: isInternal ? ticket.status : "AWAITING_USER" }, { status: 201 });
}
