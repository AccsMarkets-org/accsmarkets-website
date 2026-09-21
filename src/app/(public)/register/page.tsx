import { Suspense } from "react";
import { prisma } from "@/lib/db";
import TrustPanelServer from "@/components/auth/TrustPanelServer";
import { RegisterFormClient } from "@/components/auth/RegisterFormClient";

export const metadata = {
  title: "Create Account — AccsMarkets",
};

async function getStats() {
  try {
    const [escrowAgg, completedEscrows, reviewAgg, activeListings] = await Promise.all([
      prisma.escrow.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
      prisma.escrow.count({ where: { status: "COMPLETED" } }),
      prisma.review.aggregate({ _avg: { rating: true } }),
      prisma.listing.count({ where: { status: "ACTIVE" } }),
    ]);
    return {
      escrowVolume: Number(escrowAgg._sum.amount ?? 0),
      completedEscrows,
      avgRating: Number(reviewAgg._avg.rating ?? 4.9),
      activeListings,
    };
  } catch {
    return { escrowVolume: 0, completedEscrows: 0, avgRating: 4.9, activeListings: 0 };
  }
}

export default async function RegisterPage() {
  const stats = await getStats();

  return (
    <div className="flex min-h-screen">
      <TrustPanelServer stats={stats} variant="register" />
      <Suspense
        fallback={
          <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16">
            <div className="mx-auto w-full max-w-sm space-y-4">
              <div className="h-8 w-48 rounded-xl bg-surface animate-pulse" />
              <div className="h-12 rounded-xl bg-surface animate-pulse" />
              <div className="h-12 rounded-xl bg-surface animate-pulse" />
              <div className="h-12 rounded-xl bg-surface animate-pulse" />
              <div className="h-12 rounded-xl bg-surface animate-pulse" />
            </div>
          </div>
        }
      >
        <RegisterFormClient />
      </Suspense>
    </div>
  );
}
