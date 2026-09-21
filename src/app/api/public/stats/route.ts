import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Cache for 1 hour
export const revalidate = 3600;

export async function GET() {
  try {
    const [escrowAgg, completedEscrows, reviewAgg, activeListings] = await Promise.all([
      prisma.escrow.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
      }),
      prisma.escrow.count({ where: { status: "COMPLETED" } }),
      prisma.review.aggregate({ _avg: { rating: true } }),
      prisma.listing.count({ where: { status: "ACTIVE" } }),
    ]);

    return NextResponse.json({
      escrowVolume: Number(escrowAgg._sum.amount ?? 0),
      completedEscrows,
      avgRating: reviewAgg._avg.rating !== null ? Number(reviewAgg._avg.rating) : 0,
      activeListings,
    });
  } catch {
    // Return safe fallback values so the UI never breaks
    return NextResponse.json({
      escrowVolume: 0,
      completedEscrows: 0,
      avgRating: 0,
      activeListings: 0,
    });
  }
}
