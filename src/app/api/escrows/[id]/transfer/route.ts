import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertTransition, EscrowTransitionError } from "@/lib/escrow-state-machine";
import { createNotification } from "@/lib/notifications";
import { emitToUser } from "@/lib/socket";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const escrow = await prisma.escrow.findUnique({
    where: { id: params.id },
    include: { listing: { select: { title: true } } },
  });
  if (!escrow) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });

  // This is a legacy admin-only route for platforms without a transfer policy.
  // For manager-add flow escrows the proper route is /add-buyer-manager (which sets the countdown).
  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    assertTransition(escrow.status, "IN_TRANSFER");
  } catch (err) {
    if (err instanceof EscrowTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  let updated;
  try {
    updated = await prisma.escrow.update({
      where: { id: escrow.id },
      data: { status: "IN_TRANSFER", transferStartedAt: new Date() },
    });
  } catch {
    return NextResponse.json({ error: "Failed to update escrow" }, { status: 500 });
  }

  await createNotification({
    userId: escrow.buyerId,
    type: "ESCROW",
    title: "Transfer in progress",
    body: `Ownership transfer for "${escrow.listing.title}" is underway.`,
    link: `/dashboard/escrows/${escrow.id}`,
  });
  emitToUser(escrow.buyerId, "escrow_transferring", { escrowId: escrow.id });

  return NextResponse.json({ escrow: updated });
}
