import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertTransition, EscrowTransitionError } from "@/lib/escrow-state-machine";
import { createNotification } from "@/lib/notifications";
import { emitToUser } from "@/lib/socket";
import { z } from "zod";

export const dynamic = "force-dynamic";

const disputeSchema = z.object({ reason: z.string().trim().min(10).max(3000) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = disputeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Describe the problem in at least 10 characters." }, { status: 400 });
  }

  const escrow = await prisma.escrow.findUnique({
    where: { id: params.id },
    include: { listing: { select: { title: true } }, dispute: true },
  });
  if (!escrow) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });

  const isParticipant = escrow.buyerId === session.user.id || escrow.sellerId === session.user.id;
  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (escrow.dispute) {
    return NextResponse.json({ error: "A dispute is already open for this escrow." }, { status: 409 });
  }

  try {
    assertTransition(escrow.status, "DISPUTED");
  } catch (err) {
    if (err instanceof EscrowTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  let dispute;
  try {
    [, dispute] = await prisma.$transaction([
      prisma.escrow.update({ where: { id: escrow.id }, data: { status: "DISPUTED" } }),
      prisma.dispute.create({
        data: { escrowId: escrow.id, openedById: session.user.id, reason: parsed.data.reason },
      }),
    ]);
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === "P2002") {
      return NextResponse.json({ error: "A dispute is already open for this escrow." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to open dispute" }, { status: 500 });
  }

  const counterpartyId = session.user.id === escrow.buyerId ? escrow.sellerId : escrow.buyerId;
  await createNotification({
    userId: counterpartyId,
    type: "DISPUTE",
    title: "Dispute opened",
    body: `A dispute was opened on the escrow for "${escrow.listing.title}". An admin will review it.`,
    link: `/dashboard/escrows/${escrow.id}`,
  });
  emitToUser(counterpartyId, "dispute_opened", { escrowId: escrow.id, disputeId: dispute.id });

  return NextResponse.json({ dispute }, { status: 201 });
}
