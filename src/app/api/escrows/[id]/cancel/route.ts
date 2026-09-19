import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cancelEscrowSchema } from "@/lib/validation/escrow";
import { EscrowTransitionError } from "@/lib/escrow-state-machine";
import { createNotification } from "@/lib/notifications";
import { emitToUser } from "@/lib/socket";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = cancelEscrowSchema.safeParse(body ?? {});
  const reason = parsed.success ? parsed.data.reason : undefined;

  const escrow = await prisma.escrow.findUnique({
    where: { id: params.id },
    include: { listing: { select: { id: true, title: true } } },
  });
  if (!escrow) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });

  const isBuyer = escrow.buyerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isBuyer && !isAdmin) {
    return NextResponse.json({ error: "Only the buyer can cancel a funded escrow." }, { status: 403 });
  }

  // Cancel is allowed while FUNDED or AWAITING_MANAGER_ADD (before the seller has submitted for review).
  const cancellableStatuses = ["FUNDED", "AWAITING_MANAGER_ADD"] as const;
  if (!(cancellableStatuses as readonly string[]).includes(escrow.status)) {
    return NextResponse.json(
      { error: "This escrow can no longer be cancelled. Open a dispute instead." },
      { status: 400 },
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const fresh = await tx.escrow.findUniqueOrThrow({ where: { id: escrow.id } });
    if (!(cancellableStatuses as readonly string[]).includes(fresh.status)) {
      throw new EscrowTransitionError(fresh.status, "CANCELLED");
    }

    const buyer = await tx.user.findUniqueOrThrow({ where: { id: escrow.buyerId } });
    // Full refund including the escrow fee (spec rule #4).
    const refund = Number(escrow.totalCharged);
    const newBalance = Number(buyer.walletBalance) + refund;

    await tx.user.update({ where: { id: buyer.id }, data: { walletBalance: { increment: refund } } });
    await tx.transaction.create({
      data: {
        userId: buyer.id,
        type: "REFUND",
        status: "COMPLETED",
        amount: refund,
        balanceBefore: buyer.walletBalance,
        balanceAfter: newBalance,
        escrowId: escrow.id,
      },
    });

    // Only restore listing to ACTIVE if it was active/pending — never unsuspend a suspended listing.
    const currentListing = await tx.listing.findUniqueOrThrow({
      where: { id: escrow.listingId },
      select: { status: true },
    });
    // Restore to ACTIVE if listing was taken off-market by this escrow (SOLD), or was already active.
    // Never unsuspend/undelete a listing that was in another terminal state.
    if (["SOLD", "ACTIVE", "PENDING", "DRAFT"].includes(currentListing.status)) {
      await tx.listing.update({ where: { id: escrow.listingId }, data: { status: "ACTIVE" } });
    }

    return tx.escrow.update({
      where: { id: escrow.id },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
    });
  }).catch((err) => {
    if (err instanceof EscrowTransitionError) return null;
    throw err;
  });

  if (!updated) {
    return NextResponse.json({ error: "Escrow is no longer cancellable." }, { status: 409 });
  }

  for (const userId of [escrow.buyerId, escrow.sellerId]) {
    await createNotification({
      userId,
      type: "ESCROW",
      title: "Escrow cancelled",
      body: `The escrow for "${escrow.listing.title}" was cancelled. ${
        userId === escrow.buyerId ? `${formatCurrency(Number(escrow.totalCharged))} refunded to your wallet.` : "The listing is active again."
      }`,
      link: `/dashboard/escrows/${escrow.id}`,
    });
    emitToUser(userId, "escrow_cancelled", { escrowId: escrow.id });
  }

  return NextResponse.json({ escrow: updated });
}
