import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { submitToIndexNow } from "@/lib/indexnow";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { disputeOutcomeTemplate } from "@/lib/email-templates";
import { EscrowTransitionError } from "@/lib/escrow-state-machine";
import { formatCurrency } from "@/lib/utils";
import { checkAndAwardBadges } from "@/lib/badges";
import { checkRateLimit } from "@/lib/rate-limit";
import { adjustTrustScore, TRUST_SCORE_DELTA } from "@/lib/trust-score";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("mark_review") }),
  z.object({ action: z.literal("close"), adminNotes: z.string().trim().min(5).max(2000) }),
  z.object({
    action: z.literal("resolve"),
    winner: z.enum(["BUYER", "SELLER"]),
    adminNotes: z.string().trim().min(5).max(2000),
  }),
]);

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_DISPUTES");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { allowed } = await checkRateLimit(`admin-finance-action:${session.user.id}`, 60, 300);
  if (!allowed) {
    return NextResponse.json({ error: "Too many actions. Slow down and try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: params.id },
    include: {
      escrow: {
        include: {
          listing: { select: { id: true, title: true } },
          buyer: { select: { id: true, email: true, name: true, walletBalance: true } },
          seller: { select: { id: true, email: true, name: true, walletBalance: true } },
        },
      },
    },
  });
  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  const { action } = parsed.data;

  if (action === "mark_review") {
    const updated = await prisma.dispute.update({
      where: { id: dispute.id },
      data: { status: "UNDER_REVIEW" },
    });
    await auditLog(prisma, session.user.id, "dispute.mark_review", "Dispute", dispute.id);
    return NextResponse.json({ dispute: updated });
  }

  // After early return above, parsed.data is now "close" | "resolve" — both have adminNotes
  const narrowed = parsed.data as { action: "close" | "resolve"; adminNotes: string; winner?: "BUYER" | "SELLER" };

  if (action === "close") {
    const updated = await prisma.$transaction(async (tx) => {
      await auditLog(tx, session.user.id, "dispute.close", "Dispute", dispute.id, { notes: narrowed.adminNotes });
      return tx.dispute.update({
        where: { id: dispute.id },
        data: { status: "CLOSED", adminNotes: narrowed.adminNotes, resolvedAt: new Date() },
      });
    });
    for (const userId of [dispute.escrow.buyerId, dispute.escrow.sellerId]) {
      await createNotification({
        userId,
        type: "DISPUTE",
        title: "Dispute closed",
        body: `The dispute for "${dispute.escrow.listing.title}" was closed without action.`,
        link: `/dashboard/escrows/${dispute.escrow.id}`,
      });
    }
    return NextResponse.json({ dispute: updated });
  }

  // action === "resolve"
  const { winner, adminNotes } = parsed.data;
  const escrow = dispute.escrow;

  const resolved = await prisma.$transaction(async (tx) => {
    const freshEscrow = await tx.escrow.findUniqueOrThrow({ where: { id: escrow.id } });
    if (freshEscrow.status !== "DISPUTED") throw new Error("NOT_DISPUTED");

    if (winner === "BUYER") {
      // Refund buyer — re-fetch inside tx to avoid stale balance SET
      const freshBuyer = await tx.user.findUniqueOrThrow({ where: { id: escrow.buyer.id } });
      const refund = Number(escrow.totalCharged);
      await tx.user.update({ where: { id: escrow.buyer.id }, data: { walletBalance: { increment: refund } } });
      await tx.transaction.create({
        data: {
          userId: escrow.buyer.id,
          type: "REFUND",
          status: "COMPLETED",
          amount: refund,
          balanceBefore: freshBuyer.walletBalance,
          balanceAfter: Number(freshBuyer.walletBalance) + refund,
          escrowId: escrow.id,
        },
      });
      await tx.listing.update({ where: { id: escrow.listingId }, data: { status: "ACTIVE" } });
      await tx.escrow.update({ where: { id: escrow.id }, data: { status: "CANCELLED" } });
      submitToIndexNow([`https://accsmarkets.org/listings/${escrow.listingId}`]).catch(() => null);
    } else {
      // Release to seller — re-fetch inside tx to avoid stale balance SET
      const freshSeller = await tx.user.findUniqueOrThrow({ where: { id: escrow.seller.id } });
      const release = Number(escrow.amount);
      await tx.user.update({ where: { id: escrow.seller.id }, data: { walletBalance: { increment: release } } });
      await tx.transaction.create({
        data: {
          userId: escrow.seller.id,
          type: "ESCROW_RELEASE",
          status: "COMPLETED",
          amount: release,
          balanceBefore: freshSeller.walletBalance,
          balanceAfter: Number(freshSeller.walletBalance) + release,
          escrowId: escrow.id,
        },
      });
      await tx.listing.update({ where: { id: escrow.listingId }, data: { status: "SOLD" } });
      await tx.escrow.update({ where: { id: escrow.id }, data: { status: "COMPLETED", completedAt: new Date() } });
      // Seller-wins is a real completion (funds released, listing sold) —
      // previously this path granted neither party the standard completion
      // trust-score credit that every other completion route gives both
      // buyer and seller. Buyer-wins is a cancellation/refund, not a
      // completion, so no completion credit applies there.
      await adjustTrustScore(tx, escrow.seller.id, TRUST_SCORE_DELTA.ESCROW_COMPLETED);
      await adjustTrustScore(tx, escrow.buyer.id, TRUST_SCORE_DELTA.ESCROW_COMPLETED);
    }

    // The losing side of an admin ruling gets a small trust-score penalty —
    // the winning side gets no separate bonus for winning (only the
    // seller-wins completion credit above, which is for the completed sale,
    // not for winning the dispute itself).
    const loserIdForPenalty = winner === "BUYER" ? escrow.seller.id : escrow.buyer.id;
    await adjustTrustScore(tx, loserIdForPenalty, TRUST_SCORE_DELTA.DISPUTE_LOST);

    await auditLog(tx, session.user.id, "dispute.resolve", "Dispute", dispute.id, { winner, adminNotes });
    return tx.dispute.update({
      where: { id: dispute.id },
      data: {
        status: winner === "BUYER" ? "RESOLVED_BUYER" : "RESOLVED_SELLER",
        resolution: `Ruled for ${winner.toLowerCase()}. ${adminNotes}`,
        adminNotes,
        resolvedAt: new Date(),
      },
    });
  }).catch((err) => {
    if (err instanceof EscrowTransitionError || (err instanceof Error && err.message === "NOT_DISPUTED")) return null;
    throw err;
  });

  if (!resolved) return NextResponse.json({ error: "Escrow is no longer disputed." }, { status: 409 });

  const outcomeMsg =
    winner === "BUYER"
      ? `Ruled in your favour — ${formatCurrency(Number(escrow.totalCharged))} has been refunded to your wallet.`
      : `Ruled in your favour — funds have been released to your wallet.`;
  const loserMsg = winner === "BUYER"
    ? `The dispute was ruled in the buyer's favour. The listing has been returned to active.`
    : `The dispute was ruled in the seller's favour. Funds were released to the seller.`;

  const winnerId = winner === "BUYER" ? escrow.buyer.id : escrow.seller.id;
  const loserId  = winner === "BUYER" ? escrow.seller.id : escrow.buyer.id;

  await Promise.all([
    createNotification({ userId: winnerId, type: "DISPUTE", title: "Dispute resolved — you won", body: outcomeMsg, link: `/dashboard/escrows/${escrow.id}` }),
    createNotification({ userId: loserId,  type: "DISPUTE", title: "Dispute resolved", body: loserMsg, link: `/dashboard/escrows/${escrow.id}` }),
    (()=>{ const t = disputeOutcomeTemplate(escrow.buyer.name ?? "there", winner === "BUYER", escrow.listing?.title ?? "listing", escrow.id, winner === "BUYER" ? outcomeMsg : loserMsg); return sendEmail({ to: escrow.buyer.email, subject: t.subject, html: t.html }); })(),
    (()=>{ const t = disputeOutcomeTemplate(escrow.seller.name ?? "there", winner === "SELLER", escrow.listing?.title ?? "listing", escrow.id, winner === "SELLER" ? outcomeMsg : loserMsg); return sendEmail({ to: escrow.seller.email, subject: t.subject, html: t.html }); })(),
  ]);

  // When seller wins, escrow is marked COMPLETED — record activity and award badges to match the normal completion flow.
  if (winner === "SELLER") {
    const activityPayload = { escrowId: escrow.id, amount: String(escrow.amount) };
    prisma.activityEvent.createMany({
      data: [
        { userId: escrow.seller.id, type: "escrow.sold", metadata: activityPayload, isPublic: true },
        { userId: escrow.buyer.id, type: "escrow.purchased", metadata: activityPayload, isPublic: false },
      ],
    }).catch(() => null);
    checkAndAwardBadges(escrow.seller.id).catch(() => null);
  }

  return NextResponse.json({ dispute: resolved });
}
