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
  if (escrow.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Only the seller can confirm the manager add." }, { status: 403 });
  }

  try {
    assertTransition(escrow.status, "PENDING_VERIFICATION");
  } catch (err) {
    if (err instanceof EscrowTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const updated = await prisma.escrow.update({
    where: { id: escrow.id },
    data: { status: "PENDING_VERIFICATION", managerAddedAt: new Date() },
  });

  // Notify buyer
  await createNotification({
    userId: escrow.buyerId,
    type: "ESCROW",
    title: "Manager add submitted",
    body: `The seller confirmed they added our escrow email to "${escrow.listing.title}". Awaiting verification.`,
    link: `/dashboard/escrows/${escrow.id}`,
  });
  emitToUser(escrow.buyerId, "escrow_manager_submitted", { escrowId: escrow.id });

  // Notify all admins
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin.id,
        type: "ESCROW",
        title: "Manager add pending verification",
        body: `Escrow for "${escrow.listing.title}" is waiting for manager add verification.`,
        link: `/admin/escrows/${escrow.id}`,
      }),
    ),
  );

  return NextResponse.json({ escrow: updated });
}
