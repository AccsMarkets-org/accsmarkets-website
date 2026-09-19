import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { emitToUser } from "@/lib/socket";
import { formatCurrency } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { escrowCompletedTemplate } from "@/lib/email-templates";
import { checkAndAwardBadges } from "@/lib/badges";
import { assertTransition, EscrowTransitionError } from "@/lib/escrow-state-machine";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; milestoneId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const escrow = await prisma.escrow.findUnique({
    where: { id: params.id },
    include: {
      seller: { select: { email: true, name: true } },
      listing: { select: { title: true } },
    },
  });
  if (!escrow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (escrow.buyerId !== session.user.id) {
    return NextResponse.json({ error: "Only the buyer can release milestones" }, { status: 403 });
  }
  if (escrow.status !== "VERIFIED") {
    return NextResponse.json({ error: "Escrow must be in VERIFIED status to release milestones" }, { status: 409 });
  }

  const milestone = await prisma.escrowMilestone.findUnique({ where: { id: params.milestoneId } });
  if (!milestone || milestone.escrowId !== params.id) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  let escrowCompleted = false;
  try {
    await prisma.$transaction(async (tx) => {
    // Re-fetch inside tx to guard against concurrent double-release
    const fresh = await tx.escrowMilestone.findUniqueOrThrow({ where: { id: milestone.id } });
    if (fresh.status === "RELEASED") throw Object.assign(new Error("ALREADY_RELEASED"), { code: "ALREADY_RELEASED" });

    const releaseAmount = Number(fresh.amount);

    await tx.escrowMilestone.update({
      where: { id: milestone.id },
      data: { status: "RELEASED", completedAt: new Date() },
    });

    const seller = await tx.user.findUniqueOrThrow({ where: { id: escrow.sellerId } });
    await tx.user.update({
      where: { id: escrow.sellerId },
      data: { walletBalance: { increment: releaseAmount } },
    });

    await tx.transaction.create({
      data: {
        userId: escrow.sellerId,
        type: "ESCROW_RELEASE",
        status: "COMPLETED",
        amount: releaseAmount,
        balanceBefore: seller.walletBalance,
        balanceAfter: Number(seller.walletBalance) + releaseAmount,
        escrowId: escrow.id,
      },
    });

    // Check if all milestones released → mark escrow complete
    const remaining = await tx.escrowMilestone.count({
      where: { escrowId: params.id, status: "PENDING" },
    });
    if (remaining === 0) {
      // Re-check the escrow's live status inside the transaction (it could have
      // moved to DISPUTED between the outer read and here) and route the
      // completion through the same shared state-machine guard every other
      // escrow-completion path uses — this used to set status directly,
      // bypassing assertTransition entirely.
      const freshEscrow = await tx.escrow.findUniqueOrThrow({ where: { id: params.id } });
      assertTransition(freshEscrow.status, "COMPLETED");
      await tx.escrow.update({
        where: { id: params.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      escrowCompleted = true;
    }
  });
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === "ALREADY_RELEASED") {
      return NextResponse.json({ error: "Milestone already released" }, { status: 409 });
    }
    if (err instanceof EscrowTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to release milestone" }, { status: 500 });
  }

  await createNotification({
    userId: escrow.sellerId,
    type: "ESCROW",
    title: "Milestone released",
    body: `${formatCurrency(Number(milestone.amount))} has been released for milestone: ${milestone.description}`,
    link: `/dashboard/escrows/${escrow.id}`,
  });
  emitToUser(escrow.sellerId, "milestone_released", { escrowId: escrow.id, milestoneId: milestone.id });

  // When the final milestone is released the escrow is now COMPLETED — notify both parties.
  if (escrowCompleted) {
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
        body: role === "seller"
          ? `All milestones released for "${escrow.listing?.title ?? "listing"}". Payment is in your wallet.`
          : `All milestones complete for "${escrow.listing?.title ?? "listing"}". Escrow is closed.`,
        link: `/dashboard/escrows/${escrow.id}`,
      });
      emitToUser(user.id, "escrow_completed", { escrowId: escrow.id });
      const { subject, html } = escrowCompletedTemplate(user.name ?? "there", escrow.listing?.title ?? "listing", escrow.id);
      sendEmail({ to: user.email, subject, html, slug: "escrow_completed" }).catch(() => null);
    }
    const activityPayload = { escrowId: escrow.id, amount: String(escrow.amount) };
    prisma.activityEvent.createMany({
      data: [
        { userId: escrow.sellerId, type: "escrow.sold", metadata: activityPayload, isPublic: true },
        { userId: escrow.buyerId, type: "escrow.purchased", metadata: activityPayload, isPublic: false },
      ],
    }).catch(() => null);
    checkAndAwardBadges(escrow.sellerId).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
