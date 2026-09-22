import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/support/count — sidebar badge.
 *  count         → tickets needing a staff reply (OPEN + AWAITING_STAFF)
 *  awaitingStaff → strictly AWAITING_STAFF
 *  mine          → tickets assigned to the caller that need a reply
 */
export async function GET() {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [open, awaitingStaff, mine] = await Promise.all([
    prisma.supportTicket.count({ where: { status: "OPEN" } }),
    prisma.supportTicket.count({ where: { status: "AWAITING_STAFF" } }),
    prisma.supportTicket.count({ where: { assigneeId: session.user.id, status: { in: ["OPEN", "AWAITING_STAFF"] } } }),
  ]);

  return NextResponse.json({ count: open + awaitingStaff, awaitingStaff, open, mine });
}
