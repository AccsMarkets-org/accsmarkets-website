import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getAdminSidebarCounts } from "@/lib/admin-cache";
import { Card } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PLATFORM_LABEL, PLATFORM_COLOR } from "@/lib/constants";
import { CountryFlag } from "@/components/ui/CountryFlag";
import type { Platform } from "@prisma/client";
import {
  AdminKpiCard,
  AdminQueueItem,
  AdminSparkline,
  AdminPlatformBreakdown,
  AdminActivityItem,
  AdminSection,
  AdminCountryBar,
} from "./AdminDashboardClient";
import { ListingViewsChart } from "@/components/ui/ListingViewsChart";

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

/** Shown at the top of the dashboard after a permission-gated page bounced
 *  the viewer here with ?denied=1 (see requireAdmin usage in each page). */
function AccessDeniedBanner() {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground"
    >
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
      <div>
        <p className="font-semibold">You don&apos;t have access to that section</p>
        <p className="text-muted">
          Your staff role doesn&apos;t include the permission it requires. Ask an owner to update your role if you need it.
        </p>
      </div>
    </div>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { denied?: string };
}) {
  const denied = searchParams.denied === "1";

  // The dashboard itself needs VIEW_ANALYTICS. Staff without it can't be
  // redirected here (that would loop), so render a small landing panel
  // instead — the sidebar still shows whichever sections they can open.
  const session = await requireAdmin("VIEW_ANALYTICS");
  if (!session) {
    return (
      <div className="flex flex-col gap-6 pb-8">
        {denied && <AccessDeniedBanner />}
        <Card>
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
            <div>
              <h1 className="text-lg font-bold text-foreground">Admin</h1>
              <p className="mt-1 text-sm text-muted">
                Your staff role doesn&apos;t include the overview dashboard. Use the sidebar to open the sections available to you.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now.toISOString().slice(0, 10));

  const [
    sidebarCounts,
    totalUsers,
    totalListings,
    activeEscrows,
    completedEscrows,
    feeRevenue,
    feeRevenuePrev,
    countryGroups,
    platformBreakdown,
    newUsersToday,
    newUsersPrev30d,
    recentAuditLogs,
    recentUsers,
    recentFeeTransactions,
    totalTransactionVolume,
    listingViewCountries,
    totalListingViews30d,
    totalListingViewsPrev30d,
    listingViewsByDay,
  ] = await Promise.all([
    getAdminSidebarCounts(),
    prisma.user.count(),
    prisma.listing.count(),
    prisma.escrow.count({ where: { status: { in: ["FUNDED", "SUBMITTED", "VERIFIED", "IN_TRANSFER"] } } }),
    prisma.escrow.count({ where: { status: "COMPLETED" } }),
    prisma.transaction.aggregate({
      where: { type: "PLATFORM_FEE", status: "COMPLETED", createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "PLATFORM_FEE", status: "COMPLETED", createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      _sum: { amount: true },
    }),
    prisma.$queryRaw<{ countryCode: string | null; cnt: bigint }[]>`
      SELECT countryCode, COUNT(*) AS cnt FROM User
      WHERE countryCode IS NOT NULL
      GROUP BY countryCode ORDER BY cnt DESC LIMIT 8
    `.catch(() => [] as { countryCode: string | null; cnt: bigint }[]),
    prisma.listing.groupBy({
      by: ["platform"],
      where: { status: "ACTIVE" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.user.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    prisma.adminAuditLog.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { admin: { select: { username: true, name: true } } },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      take: 500,
    }),
    prisma.transaction.findMany({
      where: { type: "PLATFORM_FEE", status: "COMPLETED", createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, amount: true },
      take: 1000,
    }),
    prisma.escrow.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    }),
    // Listing views by country (last 30d) — raw SQL avoids Prisma client schema mismatch
    prisma.$queryRaw<{ countryCode: string; cnt: bigint }[]>`
      SELECT countryCode, COUNT(*) AS cnt
      FROM ListingViewEvent
      WHERE countryCode IS NOT NULL AND createdAt >= ${thirtyDaysAgo}
      GROUP BY countryCode ORDER BY cnt DESC LIMIT 8
    `.catch(() => [] as { countryCode: string; cnt: bigint }[]),
    // Total listing views this month
    prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(*) AS cnt FROM ListingViewEvent WHERE createdAt >= ${thirtyDaysAgo}
    `.then((r) => Number(r[0]?.cnt ?? 0)).catch(() => 0),
    // Total listing views previous month
    prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(*) AS cnt FROM ListingViewEvent WHERE createdAt >= ${sixtyDaysAgo} AND createdAt < ${thirtyDaysAgo}
    `.then((r) => Number(r[0]?.cnt ?? 0)).catch(() => 0),
    // Views per day (last 30d) for sparkline
    prisma.$queryRaw<{ day: string; cnt: bigint }[]>`
      SELECT DATE(createdAt) AS day, COUNT(*) AS cnt
      FROM ListingViewEvent WHERE createdAt >= ${thirtyDaysAgo}
      GROUP BY DATE(createdAt)
    `.catch(() => [] as { day: string; cnt: bigint }[]),
  ]);

  const { pendingListings, pendingDeposits, pendingWithdrawals, openDisputes, pendingKyc, pendingBankTransfers, pendingPaypalDeposits } = sidebarCounts;

  const revenue30d = Number(feeRevenue._sum.amount ?? 0);
  const revenuePrev30d = Number(feeRevenuePrev._sum.amount ?? 0);
  const revenueTrend = revenuePrev30d > 0 ? Math.round(((revenue30d - revenuePrev30d) / revenuePrev30d) * 100) : null;

  const totalUrgent = pendingListings + pendingDeposits + pendingBankTransfers + pendingPaypalDeposits + pendingWithdrawals + openDisputes + pendingKyc;

  const userSparkData = groupByDay(recentUsers, 30);
  const revSparkData = groupRevenueByDay(recentFeeTransactions as { createdAt: Date; amount: { toNumber(): number } }[], 30);
  const userPoints = userSparkData.map((d) => d.count);
  const revPoints = revSparkData.map((d) => d.count);
  const dayKeys = userSparkData.map((d) => d.date);

  const userTrend = newUsersPrev30d > 0 ? Math.round(((recentUsers.length - newUsersPrev30d) / newUsersPrev30d) * 100) : null;

  const totalPlatformListings = platformBreakdown.reduce((s, p) => s + p._count.id, 0) || 1;
  const platforms = platformBreakdown.slice(0, 6).map((p) => ({
    key: p.platform,
    label: PLATFORM_LABEL[p.platform as Platform] ?? p.platform,
    color: PLATFORM_COLOR[p.platform as Platform] ?? "#6366f1",
    count: p._count.id,
    pct: Math.round((p._count.id / totalPlatformListings) * 100),
  }));

  const transactionVolume = Number(totalTransactionVolume._sum.amount ?? 0);

  // Listing views sparkline data — raw SQL returns { day, cnt }
  const viewDayMap: Record<string, number> = {};
  for (const row of listingViewsByDay as { day: string; cnt: bigint }[]) {
    const key = typeof row.day === "string" ? row.day : new Date(row.day).toISOString().slice(0, 10);
    viewDayMap[key] = Number(row.cnt);
  }
  const viewDayKeys30: string[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo.getTime() + i * 86400_000);
    viewDayKeys30.push(d.toISOString().slice(0, 10));
  }
  const viewPoints = viewDayKeys30.map((k) => viewDayMap[k] ?? 0);
  const viewDayKeys = viewDayKeys30;
  const viewTrend = (totalListingViewsPrev30d as number) > 0
    ? Math.round((((totalListingViews30d as number) - (totalListingViewsPrev30d as number)) / (totalListingViewsPrev30d as number)) * 100)
    : null;
  const viewCountryRows = (listingViewCountries as { countryCode: string; cnt: bigint }[])
    .map((c) => ({ code: c.countryCode, count: Number(c.cnt) }));
  const topViewCountry = viewCountryRows[0] ?? null;
  const totalViewsByCountry = viewCountryRows.reduce((s, c) => s + c.count, 0) || 1;

  return (
    <div className="flex flex-col gap-6 pb-8">
      {denied && <AccessDeniedBanner />}

      {/* Header */}
      <AdminSection delay={0}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
              <p className="text-sm text-muted">
                {newUsersToday} new user{newUsersToday !== 1 ? "s" : ""} today
                {totalUrgent > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
                    </span>
                    {totalUrgent} urgent
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/analytics"
              className="flex items-center gap-2 rounded-xl border border-surface-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-surface hover:border-brand-300 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Full Analytics
            </Link>
          </div>
        </div>
      </AdminSection>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminKpiCard
          label="Total Users"
          value={totalUsers}
          sub={`${recentUsers.length} new (30d)`}
          icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
          color="text-brand-600"
          bg="bg-brand-50"
          href="/admin/users"
          trend={userTrend}
          delay={0.05}
        />
        <AdminKpiCard
          label="30-Day Revenue"
          value={revenue30d}
          prefix="$"
          sub="Platform fees collected"
          icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
          color="text-amber-600"
          bg="bg-amber-50"
          href="/admin/analytics"
          trend={revenueTrend}
          delay={0.1}
        />
        <AdminKpiCard
          label="Active Escrows"
          value={activeEscrows}
          sub={`${completedEscrows} completed all-time`}
          icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
          color="text-blue-600"
          bg="bg-blue-50"
          href="/admin/escrows"
          delay={0.15}
        />
        <AdminKpiCard
          label="Total Listings"
          value={totalListings}
          sub={`${pendingListings} pending review`}
          icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>}
          color="text-green-600"
          bg="bg-green-50"
          href="/admin/listings"
          delay={0.2}
        />
      </div>

      {/* Transaction Volume Banner */}
      <AdminSection delay={0.15}>
        <div className="rounded-2xl bg-gradient-to-r from-brand-500 via-brand-600 to-purple-600 p-6 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/80">Total Transaction Volume</p>
              <p className="text-3xl font-bold">{formatCurrency(transactionVolume.toString())}</p>
              <p className="text-sm text-white/70 mt-1">{completedEscrows} successful escrows completed</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-white/70">Avg. Deal Size</p>
                <p className="text-xl font-bold">{completedEscrows > 0 ? formatCurrency((transactionVolume / completedEscrows).toFixed(2)) : "$0"}</p>
              </div>
              <div className="hidden sm:block h-12 w-px bg-white/20" />
              <Link
                href="/admin/escrows"
                className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition"
              >
                <span className="hidden sm:inline">View Escrows</span>
                <span className="sm:hidden">Escrows</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </AdminSection>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column — Charts */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* User Growth Chart */}
          <AdminSection delay={0.2}>
            <Card className="overflow-hidden p-0">
              <div className="flex items-start justify-between px-5 pt-5 pb-3">
                <div>
                  <h3 className="font-semibold text-foreground">User Growth</h3>
                  <p className="text-sm text-muted">Last 30 days</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">{recentUsers.length}</p>
                  {userTrend !== null && (
                    <p className={`text-xs font-medium ${userTrend >= 0 ? "text-success" : "text-danger"}`}>
                      {userTrend >= 0 ? "▲" : "▼"} {Math.abs(userTrend)}% vs prev 30d
                    </p>
                  )}
                </div>
              </div>
              <div className="px-2 pb-3">
                <AdminSparkline points={userPoints} days={dayKeys} color="#6366f1" gradientId="userGrad" />
              </div>
            </Card>
          </AdminSection>

          {/* Revenue Chart */}
          <AdminSection delay={0.25}>
            <Card className="overflow-hidden p-0">
              <div className="flex items-start justify-between px-5 pt-5 pb-3">
                <div>
                  <h3 className="font-semibold text-foreground">Fee Revenue</h3>
                  <p className="text-sm text-muted">Last 30 days</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(revenue30d.toString())}</p>
                  {revenueTrend !== null && (
                    <p className={`text-xs font-medium ${revenueTrend >= 0 ? "text-success" : "text-danger"}`}>
                      {revenueTrend >= 0 ? "▲" : "▼"} {Math.abs(revenueTrend)}% vs prev 30d
                    </p>
                  )}
                </div>
              </div>
              <div className="px-2 pb-3">
                <AdminSparkline points={revPoints} days={dayKeys} color="#f59e0b" gradientId="revGrad" />
              </div>
            </Card>
          </AdminSection>

          {/* Listing Analytics — full redesign */}
          <AdminSection delay={0.28}>
            <Card className="overflow-hidden p-0">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
                    <svg className="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Listing Analytics</h3>
                    <p className="text-xs text-muted">Unique visitor views per listing</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-muted">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  Last 30 days
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-surface-border border-b border-surface-border">
                <div className="px-3 py-3 sm:px-5 sm:py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Total Views</p>
                  <p className="mt-1 text-xl font-bold text-foreground sm:text-3xl">{totalListingViews30d.toLocaleString()}</p>
                  <p className="text-[11px] text-muted">all time unique</p>
                </div>
                <div className="px-3 py-3 sm:px-5 sm:py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Last 7 Days</p>
                  <p className="mt-1 text-xl font-bold text-foreground sm:text-3xl">
                    {viewPoints.slice(-7).reduce((s, v) => s + v, 0).toLocaleString()}
                  </p>
                  {viewTrend !== null && (
                    <p className={`text-[11px] font-medium ${viewTrend >= 0 ? "text-success" : "text-danger"}`}>
                      {viewTrend >= 0 ? "▲" : "▼"} {Math.abs(viewTrend)}% vs prev 7d
                    </p>
                  )}
                </div>
                <div className="px-3 py-3 sm:px-5 sm:py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Top Country</p>
                  {topViewCountry?.code ? (
                    <>
                      <div className="mt-1 flex items-center gap-1.5">
                        <CountryFlag code={topViewCountry.code} className="h-4 w-auto shrink-0 sm:h-5" />
                        <p className="truncate text-sm font-bold text-foreground sm:text-base">{topViewCountry.code === "US" ? "United States" : topViewCountry.code}</p>
                      </div>
                      <p className="text-[11px] text-muted">{topViewCountry.count} views</p>
                    </>
                  ) : <p className="mt-1 text-lg font-bold text-foreground">—</p>}
                </div>
              </div>

              {/* Chart + Country sidebar */}
              <div className="flex min-h-[160px]">
                {/* Area chart */}
                <div className="flex-1 px-3 py-3 min-w-0">
                  <ListingViewsChart points={viewPoints} days={viewDayKeys} />
                </div>

                {/* Country breakdown — hidden on small screens to avoid crushing the chart */}
                {viewCountryRows.length > 0 && (
                  <div className="hidden md:block w-56 shrink-0 border-l border-surface-border px-4 py-4">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted">Visitors by Country</p>
                    <div className="space-y-2.5">
                      {viewCountryRows.map((row) => {
                        const pct = Math.round((row.count / totalViewsByCountry) * 100);
                        return (
                          <AdminCountryBar key={row.code} code={row.code} count={row.count} pct={pct} color="#6366f1" />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </AdminSection>

          {/* Platform Breakdown */}
          {platforms.length > 0 && (
            <AdminSection delay={0.35}>
              <Card>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground">Listings by Platform</h3>
                    <p className="text-sm text-muted">{totalPlatformListings} active listings</p>
                  </div>
                  <Link href="/admin/listings" className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline">
                    View all
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
                <AdminPlatformBreakdown platforms={platforms} />
              </Card>
            </AdminSection>
          )}
        </div>

        {/* Right Column — Queue & Activity */}
        <div className="flex flex-col gap-6">
          {/* Action Queue */}
          <AdminSection delay={0.2}>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Action Queue</h3>
                {totalUrgent > 0 && (
                  <span className="text-xs font-bold text-warning">{totalUrgent} items</span>
                )}
              </div>
              <div className="space-y-1">
                <AdminQueueItem label="Listing reviews" count={pendingListings} href="/admin/listings" delay={0.05} icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} />
                <AdminQueueItem label="Manual deposits" count={pendingDeposits} href="/admin/deposits" delay={0.1} icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2v14m0 0l-4-4m4 4l4-4"/><rect x="3" y="18" width="18" height="4" rx="1"/></svg>} />
                <AdminQueueItem label="Bank transfers" count={pendingBankTransfers} href="/admin/bank-transfers" delay={0.15} icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>} />
                <AdminQueueItem label="PayPal deposits" count={pendingPaypalDeposits} href="/admin/paypal-deposits" delay={0.18} icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M7 4h7a4 4 0 014 4c0 3-2 5-5 5H9l-1 6H5l2.5-15z"/><path d="M11 8h5a3 3 0 013 3c0 2.2-1.8 4-4 4h-3"/></svg>} />
                <AdminQueueItem label="Withdrawals" count={pendingWithdrawals} href="/admin/withdrawals" delay={0.2} icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 22V8m0 0l-4 4m4-4l4 4"/><rect x="3" y="2" width="18" height="4" rx="1"/></svg>} />
                <AdminQueueItem label="Open disputes" count={openDisputes} href="/admin/disputes" delay={0.25} icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>} />
                <AdminQueueItem label="KYC reviews" count={pendingKyc} href="/admin/verification" delay={0.3} icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} />
              </div>
            </Card>
          </AdminSection>

          {/* Country Breakdown */}
          {countryGroups.some((g) => g.countryCode) && (
            <AdminSection delay={0.25}>
              <Card>
                <h3 className="font-semibold text-foreground mb-4">Users by Country</h3>
                <div className="space-y-2.5">
                  {countryGroups
                    .filter((g) => g.countryCode)
                    .slice(0, 6)
                    .map((g) => {
                      const count = Number(g.cnt);
                      const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
                      return (
                        <div key={g.countryCode} className="flex items-center gap-3">
                          <CountryFlag code={g.countryCode!} />
                          <div className="flex-1 h-2 rounded-full bg-surface-border overflow-hidden">
                            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                          <span className="text-xs font-medium text-foreground w-8 text-right">{count}</span>
                          <span className="text-xs text-muted w-8 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                </div>
              </Card>
            </AdminSection>
          )}

          {/* Recent Admin Activity */}
          {recentAuditLogs.length > 0 && (
            <AdminSection delay={0.3}>
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Recent Activity</h3>
                  <Link href="/admin/audit-log" className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline">
                    View all
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
                <div className="divide-y divide-surface-border">
                  {recentAuditLogs.map((log, i) => (
                    <AdminActivityItem
                      key={log.id}
                      avatar={(log.admin.name ?? log.admin.username ?? "A").slice(0, 1).toUpperCase()}
                      name={log.admin.name ?? log.admin.username ?? "Admin"}
                      action={log.action.replace(/_/g, " ")}
                      target={`${log.targetType}:${log.targetId.slice(0, 8)}`}
                      time={formatDate(log.createdAt)}
                      delay={i * 0.05}
                    />
                  ))}
                </div>
              </Card>
            </AdminSection>
          )}
        </div>
      </div>
    </div>
  );
}
