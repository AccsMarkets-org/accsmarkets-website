import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PHASE_LABELS } from "@/lib/dispute-phases";

export const dynamic = "force-dynamic";

/** GET /api/disputes — disputes on escrows where the caller is buyer or seller. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const disputes = await prisma.dispute.findMany({
    where: { escrow: { OR: [{ buyerId: userId }, { sellerId: userId }] } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, status: true, phase: true, reason: true, evidenceDeadline: true, createdAt: true, resolvedAt: true, openedById: true,
      escrow: {
        select: {
          id: true, amount: true, status: true, buyerId: true, sellerId: true,
          listing: { select: { id: true, title: true, platform: true } },
          buyer: { select: { id: true, username: true, name: true } },
          seller: { select: { id: true, username: true, name: true } },
        },
      },
      _count: { select: { evidence: true } },
    },
  });

  return NextResponse.json({
    disputes: disputes.map((d) => {
      const isBuyer = d.escrow.buyerId === userId;
      const counterparty = isBuyer ? d.escrow.seller : d.escrow.buyer;
      return {
        id: d.id,
        status: d.status,
        phase: d.phase,
        phaseLabel: PHASE_LABELS[d.phase],
        reason: d.reason,
        evidenceDeadline: d.evidenceDeadline,
        createdAt: d.createdAt,
        resolvedAt: d.resolvedAt,
        openedByMe: d.openedById === userId,
        role: isBuyer ? "buyer" : "seller",
        escrow: { id: d.escrow.id, amount: d.escrow.amount.toString(), status: d.escrow.status, listing: d.escrow.listing },
        counterparty: { id: counterparty.id, username: counterparty.username, name: counterparty.name },
        evidenceCount: d._count.evidence,
      };
    }),
  });
}
