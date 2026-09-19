import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/trust-report — public platform trust metrics (cached 1h)
export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const [
    totalUsers,
    verifiedUsers,
    totalEscrows,
    completedEscrows,
    disputedEscrows,
    totalListings,
    activeListings,
    avgTrustScore,
  ] = await Promise.all([
    prisma.user.count({ where: { isBanned: false } }),
    prisma.user.count({ where: { kycLevel: { in: ["PHONE", "ID_VERIFIED"] } } }),
    prisma.escrow.count(),
    prisma.escrow.count({ where: { status: "COMPLETED" } }),
    prisma.escrow.count({ where: { status: "DISPUTED" } }),
    prisma.listing.count(),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.user
      .aggregate({ _avg: { trustScore: true } })
      .then((r) => Math.round(r._avg.trustScore ?? 0)),
  ]);

  const escrowSuccessRate =
    completedEscrows + disputedEscrows > 0
      ? Math.round((completedEscrows / (completedEscrows + disputedEscrows)) * 100)
      : 100;

  return NextResponse.json({
    totalUsers,
    verifiedUsers,
    verifiedUsersPct: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
    totalEscrows,
    completedEscrows,
    disputedEscrows,
    escrowSuccessRate,
    totalListings,
    activeListings,
    avgTrustScore,
    generatedAt: new Date().toISOString(),
  });
}
