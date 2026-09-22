import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { TICKET_STATUSES, TICKET_PRIORITIES } from "@/components/support/constants";
import type { Prisma, SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const CATEGORIES: SupportTicketCategory[] = ["ACCOUNT", "PAYMENT", "ESCROW", "LISTING", "KYC", "TECHNICAL", "OTHER"];
const PAGE_SIZE = 40;

/**
 * GET /api/admin/support/tickets
 *   ?status=OPEN|AWAITING_STAFF|AWAITING_USER|RESOLVED|CLOSED|active (default active = not RESOLVED/CLOSED)|all
 *   &category=… &priority=… &assignee=me|unassigned|all &q=<number|subject|email> &page=0
 */
export async function GET(req: Request) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "active";
  const category = searchParams.get("category") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const assignee = searchParams.get("assignee") ?? "all";
  const q = (searchParams.get("q") ?? "").trim();
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10) || 0);

  const where: Prisma.SupportTicketWhereInput = {};

  if (status === "active") where.status = { in: ["OPEN", "AWAITING_STAFF", "AWAITING_USER"] };
  else if (status !== "all" && TICKET_STATUSES.includes(status as SupportTicketStatus)) where.status = status as SupportTicketStatus;

  if (CATEGORIES.includes(category as SupportTicketCategory)) where.category = category as SupportTicketCategory;
  if (TICKET_PRIORITIES.includes(priority as SupportTicketPriority)) where.priority = priority as SupportTicketPriority;

  if (assignee === "me") where.assigneeId = session.user.id;
  else if (assignee === "unassigned") where.assigneeId = null;

  if (q) {
    const asNumber = /^#?\d+$/.test(q) ? parseInt(q.replace("#", ""), 10) : null;
    where.OR = [
      ...(asNumber !== null ? [{ number: asNumber }] : []),
      { subject: { contains: q } },
      { user: { email: { contains: q } } },
      { user: { username: { contains: q } } },
    ];
  }

  const [total, tickets, counts] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({
      where,
      orderBy: { lastReplyAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, number: true, subject: true, category: true, priority: true, status: true,
        escrowId: true, listingId: true, lastReplyAt: true, resolvedAt: true, createdAt: true,
        assigneeId: true,
        user: { select: { id: true, username: true, name: true, email: true, image: true } },
        assignee: { select: { id: true, username: true, name: true } },
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { isStaff: true, body: true, createdAt: true },
        },
      },
    }),
    prisma.supportTicket.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const statusCounts = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Partial<Record<SupportTicketStatus, number>>;

  return NextResponse.json({
    tickets: tickets.map(({ messages, ...t }) => ({ ...t, lastMessage: messages[0] ?? null })),
    total,
    page,
    pageSize: PAGE_SIZE,
    statusCounts,
  });
}
