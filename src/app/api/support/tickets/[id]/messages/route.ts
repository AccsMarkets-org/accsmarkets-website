import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import { emitToAdmins } from "@/lib/socket";
import { REOPEN_WINDOW_DAYS } from "@/components/support/constants";
import { attachmentsSchema } from "../../../_shared";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const replySchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty").max(5000),
  attachments: attachmentsSchema,
});

/**
 * POST /api/support/tickets/[id]/messages — user reply. Moves the ticket to
 * AWAITING_STAFF. Replying to a RESOLVED ticket inside the reopen window
 * reopens it; CLOSED tickets are read-only.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { allowed } = await checkRateLimit(`support-reply:${userId}`, 30, 3600);
  if (!allowed) return NextResponse.json({ error: "You're replying too fast. Please wait a bit." }, { status: 429 });

  const raw = await req.json().catch(() => null);
  const parsed = replySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const body = sanitizeText(parsed.data.body);
  const attachments = parsed.data.attachments ?? [];
  if (!body && attachments.length === 0) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: params.id, userId },
    select: { id: true, number: true, status: true, resolvedAt: true },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  if (ticket.status === "CLOSED") {
    return NextResponse.json({ error: "This ticket is closed. Please open a new ticket." }, { status: 409 });
  }
  if (ticket.status === "RESOLVED") {
    const resolvedAt = ticket.resolvedAt?.getTime() ?? 0;
    if (Date.now() - resolvedAt > REOPEN_WINDOW_DAYS * 86_400_000) {
      return NextResponse.json({ error: "This ticket was resolved more than a week ago. Please open a new ticket." }, { status: 409 });
    }
  }

  const now = new Date();
  const [message] = await prisma.$transaction([
    prisma.supportTicketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: userId,
        isStaff: false,
        isInternal: false,
        body: body || "(attachment)",
        attachments: (attachments.length > 0 ? attachments : undefined) as Prisma.InputJsonValue | undefined,
      },
      include: { author: { select: { id: true, name: true, username: true, image: true } } },
    }),
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "AWAITING_STAFF", lastReplyAt: now, resolvedAt: null },
    }),
  ]);

  emitToAdmins("admin_queue_update", { type: "support_ticket_reply", ticketId: ticket.id, number: ticket.number });

  return NextResponse.json({ message, status: "AWAITING_STAFF" }, { status: 201 });
}
