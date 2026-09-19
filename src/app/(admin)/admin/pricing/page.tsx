import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PricingAdminClient } from "@/components/admin/PricingAdminClient";

export default async function AdminPricingPage() {
  const session = await requireAdmin("MANAGE_PRICING");
  if (!session) redirect("/admin");

  const [plans, counts] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.user.groupBy({
      by: ["subscriptionPlanId"],
      where: { subscriptionPlanId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const countMap: Record<string, number> = {};
  for (const r of counts) {
    if (r.subscriptionPlanId) countMap[r.subscriptionPlanId] = r._count._all;
  }

  const serialized = plans.map((p) => ({
    id:           p.id,
    name:         p.name,
    displayName:  p.displayName,
    description:  p.description,
    features:     (p.features as string[]) ?? [],
    badge:        p.badge,
    color:        p.color,
    isActive:     p.isActive,
    isPopular:    p.isPopular,
    priceMonthly: Number(p.priceMonthly),
    priceAnnual:  p.priceAnnual ? Number(p.priceAnnual) : null,
    trialDays:    p.trialDays,
    listingLimit: p.listingLimit,
    maxEscrows:   p.maxEscrows,
    escrowFeeRate:Number(p.escrowFeeRate),
    minFee:       Number(p.minFee),
    sortOrder:    p.sortOrder,
    subscribers:  countMap[p.id] ?? 0,
    createdAt:    p.createdAt.toISOString(),
    updatedAt:    p.updatedAt.toISOString(),
  }));

  return <PricingAdminClient initialPlans={serialized} />;
}
