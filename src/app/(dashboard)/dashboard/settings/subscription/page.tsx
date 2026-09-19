import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import { SubscribePlanGrid } from "@/components/subscription/SubscribePlanGrid";
import { CancelSubscriptionControl } from "@/components/subscription/CancelSubscriptionControl";

export default async function SubscriptionPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user.id },
    include: { subscriptionPlan: true, listings: { where: { status: { not: "SOLD" } } } },
  });

  const hasActivePaidPlan =
    !!user.subscriptionPlanId &&
    user.subscriptionPlan?.name !== "FREE" &&
    !!user.subscriptionExpiresAt &&
    user.subscriptionExpiresAt > new Date();

  const plans = await prisma.subscriptionPlan.findMany({ orderBy: { priceMonthly: "asc" } });
  const usedListings = user.listings.length;
  const planLimit = user.subscriptionPlan?.listingLimit ?? 5; // FREE plan default
  const pct = Math.min(100, Math.round((usedListings / planLimit) * 100));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Subscription</h1>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-lg">{user.subscriptionPlan?.name ?? "FREE"}</p>
            {user.subscriptionExpiresAt ? (
              <p className="text-sm text-muted">
                {user.subscriptionCancelAtPeriodEnd ? "Moves to Free" : "Renews"} {formatDate(user.subscriptionExpiresAt)}
              </p>
            ) : (
              <p className="text-sm text-muted">Free forever</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="text-right text-sm text-muted">
              <p>{usedListings} / {planLimit} listings used</p>
              <div className="mt-1 h-2 w-40 overflow-hidden rounded-full bg-surface-border">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {hasActivePaidPlan && (
              <CancelSubscriptionControl
                cancelAtPeriodEnd={user.subscriptionCancelAtPeriodEnd}
                effectiveDate={formatDate(user.subscriptionExpiresAt!)}
              />
            )}
          </div>
        </div>
      </Card>

      <SubscribePlanGrid
        plans={plans.map((p) => ({
          id: p.id,
          name: p.name,
          priceMonthly: Number(p.priceMonthly),
          listingLimit: p.listingLimit,
          escrowFeeRate: Number(p.escrowFeeRate),
        }))}
        currentPlanId={user.subscriptionPlanId}
        walletBalance={Number(user.walletBalance)}
      />
    </div>
  );
}
