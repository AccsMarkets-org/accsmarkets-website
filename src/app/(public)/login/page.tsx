import { Suspense } from "react";
import { prisma } from "@/lib/db";
import TrustPanelServer from "@/components/auth/TrustPanelServer";
import { LoginFormClient } from "@/components/auth/LoginFormClient";

export const metadata = {
  title: "Log In",
  description: "Log in to your AccsMarkets account to manage listings, offers, escrows and your wallet on the escrow-protected social media account marketplace.",
  alternates: { canonical: "/login" },
};

async function getStats() {
  try {
    const [escrowAgg, completedEscrows, reviewAgg] = await Promise.all([
      prisma.escrow.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
      prisma.escrow.count({ where: { status: "COMPLETED" } }),
      prisma.review.aggregate({ _avg: { rating: true } }),
    ]);
    return {
      escrowVolume: Number(escrowAgg._sum.amount ?? 0),
      completedEscrows,
      avgRating: Number(reviewAgg._avg.rating ?? 4.9),
      activeListings: 0,
    };
  } catch {
    return { escrowVolume: 0, completedEscrows: 0, avgRating: 4.9, activeListings: 0 };
  }
}

export default async function LoginPage() {
  const stats = await getStats();

  return (
    <div className="flex min-h-screen">
      <TrustPanelServer stats={stats} variant="login" />
      <Suspense
        fallback={
          <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16">
            <div className="mx-auto w-full max-w-sm space-y-4">
              <div className="h-8 w-48 rounded-xl bg-surface animate-pulse" />
              <div className="h-12 rounded-xl bg-surface animate-pulse" />
              <div className="h-12 rounded-xl bg-surface animate-pulse" />
              <div className="h-12 rounded-xl bg-surface animate-pulse" />
            </div>
          </div>
        }
      >
        <LoginFormClient />
      </Suspense>
    </div>
  );
}
