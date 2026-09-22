import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { PLATFORM_LABEL, PLATFORM_COLOR } from "@/lib/constants";
import type { Platform } from "@prisma/client";

export const revalidate = 300;

function buildSparkline(data: { date: string; count: number }[]): string {
  if (data.length < 2) return "";
  const W = 220, H = 40;
  const max = Math.max(...data.map((d) => d.count), 1);
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - (d.count / max) * H * 0.9 - H * 0.05,
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fill = `${line} L${W},${H} L0,${H} Z`;
  return `${line}|${fill}`;
}

function groupByDay(items: { createdAt: Date }[], days: number): { date: string; count: number }[] {
  const now = Date.now();
  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(now - i * 86_400_000);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const item of items) {
    const key = item.createdAt.toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key)! + 1));
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count }));
}

function groupRevenueByDay(txs: { createdAt: Date; amount: { toNumber(): number } }[], days: number): { date: string; count: number }[] {
  const now = Date.now();
  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(now - i * 86_400_000);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const tx of txs) {
    const key = tx.createdAt.toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key)! + tx.amount.toNumber()));
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count }));
}

export default async function AnalyticsPage() {
  const session = await requireAdmin("VIEW_ANALYTICS");
  if (!session) redirect("/admin?denied=1");

  const now = new Date();
  const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const day7  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);

  const [
    totalUsers, newUsersLast30, dau, totalListings, activeListings, pendingListings,
    totalEscrows, completedEscrows, openDisputes, openReports,
    totalRevenue, revenueLast30, walletTotals, platformBreakdown, escrowStatusBreakdown,
    recentUsers, recentFeeTransactions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: day30 } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: day7 } } }),
    prisma.listing.count(),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.listing.count({ where: { status: "PENDING" } }),
    prisma.escrow.count(),
    prisma.escrow.count({ where: { status: "COMPLETED" } }),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.report.count({ where: { status: { in: ["PENDING", "REVIEWING"] } } }),
    prisma.transaction.aggregate({ where: { type: "PLATFORM_FEE", status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: "PLATFORM_FEE", status: "COMPLETED", createdAt: { gte: day30 } }, _sum: { amount: true } }),
    prisma.user.aggregate({ _sum: { walletBalance: true } }),
    prisma.listing.groupBy({ by: ["platform"], where: { status: "ACTIVE" }, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    prisma.escrow.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: day30 } }, select: { createdAt: true } }),
    prisma.transaction.findMany({ where: { type: "PLATFORM_FEE", status: "COMPLETED", createdAt: { gte: day30 } }, select: { createdAt: true, amount: true } }),
  ]);

  const completionRate = totalEscrows > 0 ? Math.round((completedEscrows / totalEscrows) * 100) : 0;
  const totalPlatformListings = platformBreakdown.reduce((s, p) => s + p._count.id, 0);

  const userSparkData = groupByDay(recentUsers, 30);
  const revSparkData  = groupRevenueByDay(recentFeeTransactions as { createdAt: Date; amount: { toNumber(): number } }[], 30);
  const userSpark = buildSparkline(userSparkData);
  const revSpark  = buildSparkline(revSparkData);
  const [userLine, userFill] = userSpark ? userSpark.split("|") : ["", ""];
  const [revLine,  revFill]  = revSpark  ? revSpark.split("|")  : ["", ""];

  const escrowStatusMap: Record<string, number> = {};
  for (const r of escrowStatusBreakdown) escrowStatusMap[r.status] = r._count._all;
  const escrowStatuses = ["FUNDED", "SUBMITTED", "VERIFIED", "IN_TRANSFER", "COMPLETED", "DISPUTED"] as const;
  const maxEscrowCount = Math.max(...escrowStatuses.map((s) => escrowStatusMap[s] ?? 0), 1);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Analytics" subtitle="Platform-wide metrics and trends" />

      {/* KPI grid row 1 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total users", value: totalUsers.toLocaleString(), color: "#6366f1" },
          { label: "New (30d)", value: `+${newUsersLast30.toLocaleString()}`, color: "#22c55e" },
          { label: "Active (7d)", value: dau.toLocaleString(), color: "#3b82f6" },
          { label: "All-time revenue", value: formatCurrency(Number(totalRevenue._sum.amount ?? 0).toString()), color: "#f59e0b" },
          { label: "Revenue (30d)", value: formatCurrency(Number(revenueLast30._sum.amount ?? 0).toString()), color: "#f59e0b" },
          { label: "Platform wallets", value: formatCurrency(Number(walletTotals._sum.walletBalance ?? 0).toString()), color: "#8b5cf6" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-surface-border bg-surface p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-1 text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* KPI grid row 2 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total escrows", value: totalEscrows.toLocaleString() },
          { label: "Completed", value: completedEscrows.toLocaleString() },
          { label: "Completion rate", value: `${completionRate}%`, highlight: completionRate < 70 },
          { label: "Active listings", value: activeListings.toLocaleString() },
          { label: "Pending review", value: pendingListings.toLocaleString(), urgent: pendingListings > 0 },
          { label: "Total listings", value: totalListings.toLocaleString() },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.urgent ? "border-warning/30 bg-warning/5" : "border-surface-border bg-surface"}`}>
            <p className="text-xs text-muted">{s.label}</p>
            <p className={`mt-1 text-xl font-bold ${s.urgent ? "text-warning" : s.highlight ? "text-danger" : "text-foreground"}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Sparklines */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold mb-3">New users — 30 days</p>
          {userLine ? (
            <svg viewBox="0 0 220 40" className="w-full h-20" preserveAspectRatio="none">
              <defs>
                <linearGradient id="aug" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={userFill} fill="url(#aug)" />
              <path d={userLine} fill="none" stroke="#6366f1" strokeWidth="1.5" />
            </svg>
          ) : (
            <div className="h-20 flex items-center justify-center text-xs text-muted">No data yet</div>
          )}
        </Card>

        <Card>
          <p className="text-sm font-semibold mb-3">Fee revenue — 30 days</p>
          {revLine ? (
            <svg viewBox="0 0 220 40" className="w-full h-20" preserveAspectRatio="none">
              <defs>
                <linearGradient id="arg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={revFill} fill="url(#arg)" />
              <path d={revLine} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
            </svg>
          ) : (
            <div className="h-20 flex items-center justify-center text-xs text-muted">No data yet</div>
          )}
        </Card>
      </div>

      {/* Moderation queue + platform breakdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold mb-3">Moderation queue</p>
          <div className="flex flex-col gap-2">
            {[
              { label: "Open disputes", count: openDisputes, href: "/admin/disputes" },
              { label: "Pending reports", count: openReports, href: "/admin/reports" },
              { label: "Pending listings", count: pendingListings, href: "/admin/listings" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface-muted transition"
              >
                <span className="text-sm text-muted">{item.label}</span>
                <span className={`text-sm font-semibold ${item.count > 0 ? "text-danger" : "text-muted"}`}>
                  {item.count}
                </span>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold mb-3">Listings by platform</p>
          <div className="flex flex-col gap-2">
            {platformBreakdown.slice(0, 8).map((p) => {
              const pct = totalPlatformListings > 0 ? Math.round((p._count.id / totalPlatformListings) * 100) : 0;
              const color = PLATFORM_COLOR[p.platform as Platform] ?? "#6366f1";
              return (
                <div key={p.platform} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-muted truncate">{PLATFORM_LABEL[p.platform as Platform] ?? p.platform}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface-border overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 1)}%`, background: color }} />
                  </div>
                  <span className="w-7 text-right text-xs font-medium">{p._count.id}</span>
                  <span className="w-8 text-right text-xs text-muted">{pct}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Escrow status breakdown */}
      <Card>
        <p className="text-sm font-semibold mb-3">Escrow status breakdown</p>
        <div className="flex flex-col gap-2">
          {escrowStatuses.map((s) => {
            const count = escrowStatusMap[s] ?? 0;
            const pct = Math.round((count / (totalEscrows || 1)) * 100);
            const barPct = Math.round((count / maxEscrowCount) * 100);
            return (
              <div key={s} className="flex items-center gap-3">
                <span className="w-36 text-xs text-muted">{s.replace("_", " ")}</span>
                <div className="flex-1 h-2 rounded-full bg-surface-border overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      s === "COMPLETED" ? "bg-success"
                      : s === "DISPUTED" ? "bg-danger"
                      : s === "IN_TRANSFER" ? "bg-brand-500"
                      : "bg-brand-300"
                    }`}
                    style={{ width: `${Math.max(barPct, count > 0 ? 1 : 0)}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-medium">{count}</span>
                <span className="w-8 text-right text-xs text-muted">{pct}%</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
