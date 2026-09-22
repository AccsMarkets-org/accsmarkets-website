import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { REOPEN_WINDOW_DAYS } from "@/components/support/constants";
import { userTicketInclude } from "../../_shared";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  action: z.enum(["resolve", "reopen"]),
});

/** GET /api/support/tickets/[id] — owner only; internal notes are never returned. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: userTicketInclude,
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  return NextResponse.json({ ticket });
}

/**
 * PATCH /api/support/tickets/[id] — user-side status changes.
 *  - resolve: any open state → RESOLVED
 *  - reopen:  RESOLVED (within REOPEN_WINDOW_DAYS) → AWAITING_STAFF
 * CLOSED is terminal for the user; only staff can reopen a closed ticket.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true, status: true, resolvedAt: true },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  if (parsed.data.action === "resolve") {
    if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
      return NextResponse.json({ error: "Ticket is already resolved" }, { status: 409 });
    }
    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
      select: { id: true, status: true, resolvedAt: true },
    });
    return NextResponse.json({ ticket: updated });
  }

  // reopen
  if (ticket.status !== "RESOLVED") {
    return NextResponse.json({ error: ticket.status === "CLOSED" ? "This ticket was closed by support. Please open a new ticket." : "Ticket is not resolved" }, { status: 409 });
  }
  const resolvedAt = ticket.resolvedAt?.getTime() ?? 0;
  if (Date.now() - resolvedAt > REOPEN_WINDOW_DAYS * 86_400_000) {
    return NextResponse.json({ error: `Tickets can only be reopened within ${REOPEN_WINDOW_DAYS} days of being resolved. Please open a new ticket.` }, { status: 409 });
  }
  const updated = await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { status: "AWAITING_STAFF", resolvedAt: null, lastReplyAt: new Date() },
    select: { id: true, status: true, resolvedAt: true },
  });
  return NextResponse.json({ ticket: updated });
}
