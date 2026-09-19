import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { createNotification } from "@/lib/notifications";
import { emitToUser } from "@/lib/socket";

export const dynamic = "force-dynamic";

const schema = z.object({ days: z.coerce.number().int().min(1).max(90) });

// POST /api/admin/escrows/[id]/duration — admin sets/extends the order countdown.
// Before the transfer has started, this edits transferDeadline. Once the transfer
// countdown is already running (countdownEndsAt is set — e.g. after "Start Transfer
// Countdown" / trustless handover), it edits countdownEndsAt instead, since that's
// the field that actually gates handover/fund-release actions from that point on.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_ESCROWS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter 1–90 days" }, { status: 400 });
  }
  const { days } = parsed.data;

  const escrow = await prisma.escrow.findUnique({
    where: { id: params.id },
    select: { id: true, buyerId: true, sellerId: true, countdownEndsAt: true, listing: { select: { title: true } } },
  });
  if (!escrow) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });

  const newDeadline = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const editingCountdown = escrow.countdownEndsAt !== null;

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.escrow.update({
      where: { id: escrow.id },
      data: editingCountdown ? { countdownEndsAt: newDeadline } : { transferDeadline: newDeadline },
    });
    await auditLog(tx, session.user.id, editingCountdown ? "escrow.set_countdown" : "escrow.set_duration", "Escrow", escrow.id, { days });
    return u;
  });

  // Notify both parties (fire-and-forget) and push a live update to any open
  // escrow page / message thread so the new countdown shows without a reload.
  const title = editingCountdown ? "Transfer countdown updated" : "Order deadline updated";
  const notifyBody = editingCountdown
    ? `The transfer countdown for "${escrow.listing.title}" now ends ${days} day${days === 1 ? "" : "s"} from now.`
    : `The completion deadline for "${escrow.listing.title}" is now ${days} day${days === 1 ? "" : "s"} from now.`;
  for (const uid of [escrow.buyerId, escrow.sellerId]) {
    createNotification({ userId: uid, type: "ESCROW", title, body: notifyBody, link: `/dashboard/escrows/${escrow.id}` }).catch(() => {});
    emitToUser(uid, "escrow_countdown_updated", { escrowId: escrow.id });
  }

  return NextResponse.json({ transferDeadline: updated.transferDeadline, countdownEndsAt: updated.countdownEndsAt });
}
