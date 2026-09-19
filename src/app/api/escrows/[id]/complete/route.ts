import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertTransition, EscrowTransitionError } from "@/lib/escrow-state-machine";
import { createNotification } from "@/lib/notifications";
import { emitToUser } from "@/lib/socket";
import { sendEmail } from "@/lib/email";
import { escrowCompletedTemplate } from "@/lib/email-templates";
import { checkAndAwardBadges } from "@/lib/badges";
import { adjustTrustScore, TRUST_SCORE_DELTA } from "@/lib/trust-score";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const escrow = await prisma.escrow.findUnique({
    where: { id: params.id },
    include: { listing: { select: { id: true, title: true } } },
  });
  if (!escrow) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });

  const isBuyer = escrow.buyerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isBuyer && !isAdmin) {
    return NextResponse.json({ error: "Only the buyer (or an admin) can complete the escrow." }, { status: 403 });
  }

  // Manager-add escrows (STANDARD/TRUSTLESS) must complete via confirm-handover or execute-trustless-handover —
  // those routes enforce the countdown. Block direct /complete to prevent bypassing it.
  if (escrow.transferModel) {
    return NextResponse.json(
      { error: "This escrow uses the manager-add flow. Completion is handled automatically after the countdown." },
      { status: 400 },
    );
  }

  try {
    assertTransition(escrow.status, "COMPLETED");
  } catch (err) {
    if (err instanceof EscrowTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Re-check status inside the transaction to prevent double-release under concurrency.
    const fresh = await tx.escrow.findUniqueOrThrow({ where: { id: escrow.id } });
    if (fresh.status !== "IN_TRANSFER") {
      throw new EscrowTransitionError(fresh.status, "COMPLETED");
    }

    const seller = await tx.user.findUniqueOrThrow({ where: { id: escrow.sellerId } });
    const releaseAmount = Number(escrow.amount);

    // Seller receives the full sale price (fee was collected from the buyer at funding).
    await tx.user.update({
      where: { id: seller.id },
      data: { walletBalance: { increment: releaseAmount } },
    });
    await adjustTrustScore(tx, seller.id, TRUST_SCORE_DELTA.ESCROW_COMPLETED);

    await tx.transaction.create({
      data: {
        userId: seller.id,
        type: "ESCROW_RELEASE",
        status: "COMPLETED",
        amount: escrow.amount,
        balanceBefore: seller.walletBalance,
        balanceAfter: Number(seller.walletBalance) + releaseAmount,
        escrowId: escrow.id,
      },
    });

    // Platform fee ledger entry (recorded against the buyer, who paid it; no balance change here).
    const buyer = await tx.user.findUniqueOrThrow({ where: { id: escrow.buyerId } });
    await tx.transaction.create({
      data: {
        userId: buyer.id,
        type: "PLATFORM_FEE",
        status: "COMPLETED",
        amount: escrow.feeAmount,
        balanceBefore: buyer.walletBalance,
        balanceAfter: buyer.walletBalance,
        escrowId: escrow.id,
      },
    });

    await adjustTrustScore(tx, buyer.id, TRUST_SCORE_DELTA.ESCROW_COMPLETED);

    await tx.listing.update({
      where: { id: escrow.listingId },
      data: { status: "SOLD", soldAt: new Date() },
    });

    return tx.escrow.update({
      where: { id: escrow.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }).catch((err) => {
    if (err instanceof EscrowTransitionError) return null;
    throw err;
  });

  if (!updated) {
    return NextResponse.json({ error: "Escrow is no longer in a completable state." }, { status: 409 });
  }

  // Notify + email both parties (non-fatal).
  const [buyer, seller] = await Promise.all([
    prisma.user.findUnique({ where: { id: escrow.buyerId } }),
    prisma.user.findUnique({ where: { id: escrow.sellerId } }),
  ]);

  for (const [user, role] of [
    [buyer, "buyer"],
    [seller, "seller"],
  ] as const) {
    if (!user) continue;
    await createNotification({
      userId: user.id,
      type: "ESCROW",
      title: "Escrow completed 🎉",
      body:
        role === "seller"
          ? `Funds released for "${escrow.listing.title}". Payment is in your wallet.`
          : `"${escrow.listing.title}" is now yours. Trust score +5.`,
      link: `/dashboard/escrows/${escrow.id}`,
    });
    emitToUser(user.id, "escrow_completed", { escrowId: escrow.id });
    const { subject, html } = escrowCompletedTemplate(user.name ?? "there", escrow.listing.title, escrow.id);
    await sendEmail({ to: user.email, subject, html, slug: "escrow_completed" });
  }

  // Award badges to the seller (non-fatal).
  await checkAndAwardBadges(escrow.sellerId).catch(() => null);

  // Activity events for both parties (non-fatal)
  const activityPayload = { escrowId: escrow.id, amount: String(escrow.amount) };
  prisma.activityEvent.createMany({
    data: [
      { userId: escrow.sellerId, type: "escrow.sold", metadata: activityPayload, isPublic: true },
      { userId: escrow.buyerId, type: "escrow.purchased", metadata: activityPayload, isPublic: false },
    ],
  }).catch(() => null);

  return NextResponse.json({ escrow: updated });
}
