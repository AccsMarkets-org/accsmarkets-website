import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdmin("VIEW_ANALYTICS");
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersLast30,
    totalListings,
    activeListings,
    totalEscrows,
    completedEscrows,
    escrowsLast30,
    openDisputes,
    openReports,
    pendingListings,
    totalRevenue,
    revenueLast30,
    dau,
    walletTotals,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: day30 } } }),
    prisma.listing.count(),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.escrow.count(),
    prisma.escrow.count({ where: { status: "COMPLETED" } }),
    prisma.escrow.count({ where: { createdAt: { gte: day30 } } }),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.report.count({ where: { status: { in: ["PENDING", "REVIEWING"] } } }),
    prisma.listing.count({ where: { status: "PENDING" } }),
    prisma.transaction.aggregate({
      where: { type: "PLATFORM_FEE", status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "PLATFORM_FEE", status: "COMPLETED", createdAt: { gte: day30 } },
      _sum: { amount: true },
    }),
    prisma.user.count({ where: { lastSeenAt: { gte: day7 } } }),
    prisma.user.aggregate({ _sum: { walletBalance: true } }),
  ]);

  return NextResponse.json({
    users: {
      total: totalUsers,
      newLast30: newUsersLast30,
      dau,
    },
    listings: {
      total: totalListings,
      active: activeListings,
      pending: pendingListings,
    },
    escrows: {
      total: totalEscrows,
      completed: completedEscrows,
      last30: escrowsLast30,
      completionRate: totalEscrows > 0 ? Math.round((completedEscrows / totalEscrows) * 100) : 0,
    },
    moderation: {
      openDisputes,
      openReports,
    },
    revenue: {
      allTime: Number(totalRevenue._sum.amount ?? 0),
      last30: Number(revenueLast30._sum.amount ?? 0),
    },
    platform: {
      totalWalletBalance: Number(walletTotals._sum.walletBalance ?? 0),
    },
  });
}
