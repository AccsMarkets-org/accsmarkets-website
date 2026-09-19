import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdmin("VIEW_ANALYTICS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalListings,
    pendingListings,
    activeEscrows,
    pendingDeposits,
    pendingWithdrawals,
    feeRevenue,
    openDisputes,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.listing.count({ where: { status: "PENDING" } }),
    prisma.escrow.count({ where: { status: { in: ["FUNDED", "SUBMITTED", "VERIFIED", "IN_TRANSFER"] } } }),
    prisma.cryptoWallet.count({ where: { isManual: true, status: "waiting" } }),
    prisma.transaction.count({ where: { type: "WITHDRAWAL", status: "PENDING" } }),
    prisma.transaction.aggregate({
      where: { type: "PLATFORM_FEE", status: "COMPLETED", createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
  ]);

  return NextResponse.json({
    totalUsers,
    totalListings,
    pendingListings,
    activeEscrows,
    pendingDeposits,
    pendingWithdrawals,
    feeRevenue30d: Number(feeRevenue._sum.amount ?? 0),
    openDisputes,
  });
}
