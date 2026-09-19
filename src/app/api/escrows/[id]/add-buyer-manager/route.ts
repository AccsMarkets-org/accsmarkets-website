import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertTransition, EscrowTransitionError } from "@/lib/escrow-state-machine";
import { createNotification } from "@/lib/notifications";
import { emitToUser } from "@/lib/socket";

export const dynamic = "force-dynamic";

const schema = z.object({
  escrowWasOwner: z.boolean().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const escrow = await prisma.escrow.findUnique({
    where: { id: params.id },
    include: { listing: { select: { title: true, platform: true } } },
  });
  if (!escrow) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });

  const isSeller = escrow.sellerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isSeller && !isAdmin) {
    return NextResponse.json({ error: "Only the seller (or an admin) can confirm buyer manager add." }, { status: 403 });
  }

  try {
    assertTransition(escrow.status, "IN_TRANSFER");
  } catch (err) {
    if (err instanceof EscrowTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  // Server-side guard: video verification must be completed for high-value escrows
  if (escrow.videoVerificationRequired && !escrow.videoVerificationCompletedAt) {
    return NextResponse.json(
      { error: "Video verification call must be completed before starting the countdown." },
      { status: 403 },
    );
  }

  const policy = await prisma.platformTransferPolicy.findUnique({
    where: { platform: escrow.listing.platform },
    select: { transferDays: true, trustlessBootstrapDays: true },
  });
  const countdownDays =
    escrow.transferModel === "TRUSTLESS"
      ? (policy?.trustlessBootstrapDays ?? 7)
      : (policy?.transferDays ?? 3);
  const now = new Date();
  const countdownEndsAt = new Date(now.getTime() + countdownDays * 24 * 60 * 60 * 1000);

  const updateData: Record<string, unknown> = {
    status: "IN_TRANSFER",
    buyerManagerAddedAt: now,
    transferStartedAt: now,
    countdownEndsAt,
  };

  if (parsed.data.escrowWasOwner) {
    updateData.escrowOwnerPromotedAt = now;
  }

  const updated = await prisma.escrow.update({
    where: { id: escrow.id },
    data: updateData,
  });

  await Promise.all([
    createNotification({
      userId: escrow.buyerId,
      type: "ESCROW",
      title: "Transfer countdown started",
      body: `You've been added as a manager on "${escrow.listing.title}". The ${countdownDays}-day countdown has started.`,
      link: `/dashboard/escrows/${escrow.id}`,
    }),
    createNotification({
      userId: escrow.sellerId,
      type: "ESCROW",
      title: "Transfer countdown started",
      body: `Buyer has been added as manager for "${escrow.listing.title}". Countdown: ${countdownDays} days.`,
      link: `/dashboard/escrows/${escrow.id}`,
    }),
  ]);
  emitToUser(escrow.buyerId, "escrow_transferring", { escrowId: escrow.id });
  emitToUser(escrow.sellerId, "escrow_transferring", { escrowId: escrow.id });

  return NextResponse.json({ escrow: updated });
}
