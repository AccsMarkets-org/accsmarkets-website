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
  // Admin-only override for the transfer countdown, in days (1-90).
  days: z.number().int().min(1).max(90).optional(),
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

  const isBuyer = escrow.buyerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isBuyer && !isAdmin) {
    return NextResponse.json({ error: "Only the buyer can verify access." }, { status: 403 });
  }

  try {
    assertTransition(escrow.status, "VERIFIED");
  } catch (err) {
    if (err instanceof EscrowTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  // Only an admin may pick a custom duration; buyer-initiated verifies always fall
  // back to the platform default (per-platform policy, else the global setting).
  let transferDays: number;
  if (isAdmin && parsed.data.days) {
    transferDays = parsed.data.days;
  } else {
    const [settings, policy] = await Promise.all([
      prisma.platformSettings.findUnique({ where: { id: "singleton" } }),
      prisma.platformTransferPolicy.findUnique({
        where: { platform: escrow.listing.platform },
        select: { transferDays: true },
      }),
    ]);
    transferDays = policy?.transferDays ?? settings?.escrowTransferDays ?? 7;
  }
  const transferDeadline = new Date(Date.now() + transferDays * 24 * 60 * 60 * 1000);

  let updated;
  try {
    updated = await prisma.escrow.update({
      where: { id: escrow.id },
      data: { status: "VERIFIED", verifiedAt: new Date(), transferDeadline },
    });
  } catch {
    return NextResponse.json({ error: "Failed to update escrow" }, { status: 500 });
  }

  await createNotification({
    userId: escrow.sellerId,
    type: "ESCROW",
    title: "Buyer verified access",
    body: `Access confirmed for "${escrow.listing.title}". Transfer countdown started — ${transferDays} day${transferDays === 1 ? "" : "s"}.`,
    link: `/dashboard/escrows/${escrow.id}`,
  });
  emitToUser(escrow.sellerId, "escrow_verified", { escrowId: escrow.id });

  return NextResponse.json({ escrow: updated });
}
