import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EscrowTransitionError } from "@/lib/escrow-state-machine";
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
  if (escrow.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Only the seller can confirm handover." }, { status: 403 });
  }
  if (escrow.status !== "IN_TRANSFER") {
    return NextResponse.json({ error: `Cannot confirm handover from status ${escrow.status}.` }, { status: 400 });
  }
  if (escrow.transferModel !== "STANDARD") {
    return NextResponse.json({ error: "Confirm handover is only available for Standard transfer model." }, { status: 400 });
  }
  if (!escrow.countdownEndsAt || new Date() < escrow.countdownEndsAt) {
    const remaining = escrow.countdownEndsAt
      ? Math.ceil((escrow.countdownEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : "?";
    return NextResponse.json(
      { error: `Countdown has not elapsed yet. ${remaining} day(s) remaining.` },
      { status: 400 },
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const fresh = await tx.escrow.findUniqueOrThrow({ where: { id: escrow.id } });
    if (fresh.status !== "IN_TRANSFER") {
      throw new EscrowTransitionError(fresh.status, "COMPLETED");
    }

    const seller = await tx.user.findUniqueOrThrow({ where: { id: escrow.sellerId } });
    const releaseAmount = Number(escrow.amount);

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
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        sellerConfirmedHandoverAt: new Date(),
      },
    });
  }).catch((err) => {
    if (err instanceof EscrowTransitionError) return null;
    throw err;
  });

  if (!updated) {
    return NextResponse.json({ error: "Escrow is no longer in a completable state." }, { status: 409 });
  }

  const [buyer, seller] = await Promise.all([
    prisma.user.findUnique({ where: { id: escrow.buyerId } }),
    prisma.user.findUnique({ where: { id: escrow.sellerId } }),
  ]);

  for (const [user, role] of [[buyer, "buyer"], [seller, "seller"]] as const) {
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

  await checkAndAwardBadges(escrow.sellerId).catch(() => null);

  const activityPayload = { escrowId: escrow.id, amount: String(escrow.amount) };
  prisma.activityEvent.createMany({
    data: [
      { userId: escrow.sellerId, type: "escrow.sold", metadata: activityPayload, isPublic: true },
      { userId: escrow.buyerId, type: "escrow.purchased", metadata: activityPayload, isPublic: false },
    ],
  }).catch(() => null);

  return NextResponse.json({ escrow: updated });
}
