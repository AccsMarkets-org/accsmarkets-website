import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PricingClient } from "./PricingClient";

export const metadata = {
  title: "Pricing — AccsMarkets",
  description: "Simple, transparent pricing for buying and selling social media accounts.",
};

export default async function PricingPage() {
  const [plans, session] = await Promise.all([
    prisma.subscriptionPlan.findMany({ orderBy: { priceMonthly: "asc" } }),
    getServerSession(authOptions),
  ]);

  let currentPlanId: string | null = null;
  if (session?.user?.id) {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionPlanId: true },
    });
    currentPlanId = u?.subscriptionPlanId ?? null;
  }

  const serialized = plans.map((p) => ({
    id: p.id,
    name: p.name,
    priceMonthly: Number(p.priceMonthly),
    listingLimit: p.listingLimit,
    escrowFeeRate: Number(p.escrowFeeRate),
    minFee: Number(p.minFee),
  }));

  return <PricingClient plans={serialized} currentPlanId={currentPlanId} isLoggedIn={!!session} />;
}
