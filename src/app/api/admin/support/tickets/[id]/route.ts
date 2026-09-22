import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, auditLog } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { loadAdminTicket } from "../../_shared";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/** GET /api/admin/support/tickets/[id] — full thread including internal notes. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ticket = await loadAdminTicket(params.id);
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  return NextResponse.json({ ticket });
}

const patchSchema = z.object({
  status: z.enum(["OPEN", "AWAITING_USER", "AWAITING_STAFF", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  // "me" assigns to the caller; null unassigns; any other string is a staff user id.
  assigneeId: z.union([z.literal("me"), z.string().min(1).max(64), z.null()]).optional(),
}).refine((d) => d.status !== undefined || d.priority !== undefined || d.assigneeId !== undefined, "Nothing to update");

/** PATCH /api/admin/support/tickets/[id] — status / priority / assignment. Audit-logged. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    select: { id: true, number: true, subject: true, userId: true, status: true, priority: true, assigneeId: true },
  });
  if (!existing) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const data: Prisma.SupportTicketUpdateInput = {};
  const changes: Record<string, Record<string, unknown>> = {};

  if (parsed.data.status && parsed.data.status !== existing.status) {
    data.status = parsed.data.status;
    data.resolvedAt = parsed.data.status === "RESOLVED" || parsed.data.status === "CLOSED" ? new Date() : null;
    changes.status = { from: existing.status, to: parsed.data.status };
  }
  if (parsed.data.priority && parsed.data.priority !== existing.priority) {
    data.priority = parsed.data.priority;
    changes.priority = { from: existing.priority, to: parsed.data.priority };
  }
  if (parsed.data.assigneeId !== undefined) {
    const target = parsed.data.assigneeId === "me" ? session.user.id : parsed.data.assigneeId;
    if (target) {
      const staff = await prisma.user.findFirst({ where: { id: target, role: "ADMIN" }, select: { id: true } });
      if (!staff) return NextResponse.json({ error: "Assignee must be a staff member" }, { status: 400 });
    }
    if (target !== existing.assigneeId) {
      data.assignee = target ? { connect: { id: target } } : { disconnect: true };
      changes.assignee = { from: existing.assigneeId, to: target };
    }
  }

  if (Object.keys(changes).length === 0) {
    const ticket = await loadAdminTicket(existing.id);
    return NextResponse.json({ ticket, unchanged: true });
  }

  await prisma.$transaction(async (tx) => {
    await tx.supportTicket.update({ where: { id: existing.id }, data });
    if (changes.status) {
      await auditLog(tx, session.user.id, "support_ticket.status", "SupportTicket", existing.id, { number: existing.number, ...changes.status });
    }
    if (changes.assignee) {
      await auditLog(tx, session.user.id, "support_ticket.assign", "SupportTicket", existing.id, { number: existing.number, ...changes.assignee });
    }
    if (changes.priority) {
      await auditLog(tx, session.user.id, "support_ticket.priority", "SupportTicket", existing.id, { number: existing.number, ...changes.priority });
    }
  });

  // Tell the user when staff resolve/close their ticket.
  const newStatus = parsed.data.status;
  if (changes.status && (newStatus === "RESOLVED" || newStatus === "CLOSED")) {
    createNotification({
      userId: existing.userId,
      type: "SYSTEM",
      title: `Ticket #${existing.number} ${newStatus === "RESOLVED" ? "resolved" : "closed"}`,
      body: newStatus === "RESOLVED"
        ? `Support marked "${existing.subject}" as resolved. You can reopen it within 7 days if the issue persists.`
        : `Support closed "${existing.subject}". Open a new ticket if you need further help.`,
      link: `/dashboard/support/${existing.id}`,
    }).catch(() => null);
  }

  const ticket = await loadAdminTicket(existing.id);
  return NextResponse.json({ ticket });
}
