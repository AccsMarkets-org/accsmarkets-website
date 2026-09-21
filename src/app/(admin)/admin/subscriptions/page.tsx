import { ArrowRight, Infinity as InfinityIcon, TriangleAlert, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { formatDate } from "@/lib/utils";

const PLAN_TIER: Record<string, { label: string; className: string; order: number }> = {
  FREE:       { label: "Free",       className: "bg-muted/10 text-muted",          order: 0 },
  STARTER:    { label: "Starter",    className: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",        order: 1 },
  PRO:        { label: "Pro",        className: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400",      order: 2 },
  ENTERPRISE: { label: "Enterprise", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",      order: 3 },
};

function getPlanStyle(planName: string | null | undefined) {
  const key = (planName ?? "").toUpperCase();
  return PLAN_TIER[key] ?? { label: planName ?? "Unknown", className: "bg-muted/10 text-muted", order: -1 };
}

function expiryLabel(expiresAt: Date | null | undefined): { text: string; className: string; icon?: LucideIcon } {
  if (!expiresAt) return { text: "Lifetime", className: "text-brand-600 font-medium", icon: InfinityIcon };
  const diff = expiresAt.getTime() - Date.now();
  const days = Math.floor(diff / 86_400_000);
  if (diff < 0) return { text: "Expired", className: "text-danger font-medium", icon: X };
  if (days <= 3) return { text: `Expires in ${days}d`, className: "text-warning font-medium", icon: TriangleAlert };
  return { text: `Expires ${formatDate(expiresAt)}`, className: "text-muted" };
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const planFilter = searchParams.plan?.toUpperCase();

  const [users, plans, planCounts] = await Promise.all([
    prisma.user.findMany({
      where: {
        subscriptionPlanId: { not: null },
        ...(planFilter ? { subscriptionPlan: { name: planFilter } } : {}),
      },
      include: { subscriptionPlan: true },
      orderBy: { subscriptionExpiresAt: "asc" },
      take: 100,
    }),
    prisma.subscriptionPlan.findMany({ orderBy: { priceMonthly: "asc" } }),
    prisma.user.groupBy({
      by: ["subscriptionPlanId"],
      where: { subscriptionPlanId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const planCountMap: Record<string, number> = {};
  for (const r of planCounts) if (r.subscriptionPlanId) planCountMap[r.subscriptionPlanId] = r._count._all;

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        title="Subscriptions"
        badge={users.length}
        subtitle={`${users.length} active subscription${users.length !== 1 ? "s" : ""}`}
      />

      {/* Plan summary bar */}
      {plans.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted self-center">Plans:</span>
          {plans.map((plan) => {
            const style = getPlanStyle(plan.name);
            const count = planCountMap[plan.id] ?? 0;
            const isActive = planFilter === plan.name.toUpperCase();
            return (
              <a
                key={plan.id}
                href={isActive ? "/admin/subscriptions" : `/admin/subscriptions?plan=${plan.name.toUpperCase()}`}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  isActive ? "ring-2 ring-brand-500" : "hover:opacity-80"
                } ${style.className}`}
              >
                {plan.name}
                <span className="rounded-full bg-white/40 px-1.5 py-0.5 text-[10px] font-bold">{count}</span>
              </a>
            );
          })}
        </div>
      )}

      {/* No plans yet */}
      {plans.length === 0 && (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
            <svg className="h-6 w-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <p className="font-semibold text-foreground">No subscription plans created yet</p>
          <p className="mt-1 text-sm text-muted">Create plans in Pricing, then assign them to users here.</p>
          <a href="/admin/pricing" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14"/></svg>
            Go to Pricing
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      )}

      {/* User list */}
      {plans.length > 0 && (
        <div className="flex flex-col gap-2">
          {users.map((user) => {
            const planStyle = getPlanStyle(user.subscriptionPlan?.name);
            const expiry = expiryLabel(user.subscriptionExpiresAt);
            return (
              <div
                key={user.id}
                className={`rounded-2xl border p-4 bg-surface ${
                  user.subscriptionExpiresAt && user.subscriptionExpiresAt.getTime() < Date.now()
                    ? "border-danger/30"
                    : user.subscriptionExpiresAt && (user.subscriptionExpiresAt.getTime() - Date.now()) < 3 * 86_400_000
                    ? "border-warning/30"
                    : "border-surface-border"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-sm font-bold">
                      {(user.username ?? user.email ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{user.username ?? user.email}</p>
                      <p className="text-xs text-muted">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${planStyle.className}`}>
                          {planStyle.label}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 text-xs ${expiry.className}`}>
                          {expiry.icon && <expiry.icon className="h-3.5 w-3.5" aria-hidden />}
                          {expiry.text}
                        </span>
                      </div>
                    </div>
                  </div>
                  <AdminActionButtons
                    endpoint={`/api/admin/users/${user.id}`}
                    actions={[
                      { label: "Extend +30d", action: "extend_subscription", variant: "outline" as const },
                      { label: "Change plan", action: "change_plan", variant: "outline" as const, promptPlanId: true },
                      { label: "Cancel", action: "cancel_subscription", variant: "danger" as const, confirm: "Cancel this subscription?" },
                    ]}
                  />
                </div>
              </div>
            );
          })}
          {users.length === 0 && (
            <div className="rounded-2xl border border-dashed border-surface-border bg-surface p-10 text-center">
              <p className="font-medium text-foreground">No users on paid plans yet</p>
              <p className="mt-1 text-sm text-muted">
                To assign a plan to a user, go to{" "}
                <a href="/admin/users" className="text-brand-600 hover:underline">Users</a>{" "}
                → select a user → Change Plan.
              </p>
              <p className="mt-3 text-xs text-muted">
                Available plan IDs: {plans.map((p) => <span key={p.id} className="font-mono bg-surface-border/50 rounded px-1 py-0.5 mr-1">{p.name} ({p.id.slice(0,8)}…)</span>)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
