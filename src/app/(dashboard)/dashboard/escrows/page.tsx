import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { ESCROW_STATUS_STYLE, PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/constants";
import { formatCurrency, relativeTime } from "@/lib/utils";
import type { EscrowStatus } from "@prisma/client";
import { ArrowRight, ChevronRight, Shield } from "lucide-react";

const ACTIVE_STATUSES: EscrowStatus[] = ["FUNDED", "AWAITING_MANAGER_ADD", "PENDING_VERIFICATION", "SUBMITTED", "VERIFIED", "IN_TRANSFER"];

const STATUS_TABS = [
  { key: "ACTIVE",    label: "Active",    statuses: ACTIVE_STATUSES },
  { key: "COMPLETED", label: "Completed", statuses: ["COMPLETED" as EscrowStatus] },
  { key: "DISPUTED",  label: "Disputed",  statuses: ["DISPUTED" as EscrowStatus] },
  { key: "ALL",       label: "All",       statuses: [] },
];

export default async function EscrowsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const tabKey = STATUS_TABS.map((t) => t.key).includes(searchParams.tab ?? "")
    ? (searchParams.tab as string)
    : "ACTIVE";
  const activeTab = STATUS_TABS.find((t) => t.key === tabKey)!;

  const baseWhere = { OR: [{ buyerId: userId }, { sellerId: userId }] };
  const statusFilter = activeTab.statuses.length > 0
    ? { status: { in: activeTab.statuses } }
    : {};

  const [escrows, counts, totals] = await Promise.all([
    prisma.escrow.findMany({
      where: { ...baseWhere, ...statusFilter },
      orderBy: { createdAt: "desc" },
      include: {
        listing: { select: { title: true, platform: true } },
        buyer: { select: { id: true, username: true, name: true } },
        seller: { select: { id: true, username: true, name: true } },
        dispute: { select: { id: true, status: true } },
      },
    }),
    Promise.all(
      STATUS_TABS.map(async (tab) => ({
        key: tab.key,
        count: await prisma.escrow.count({
          where: tab.statuses.length > 0
            ? { ...baseWhere, status: { in: tab.statuses } }
            : baseWhere,
        }),
      }))
    ),
    prisma.escrow.aggregate({
      where: { ...baseWhere, status: { in: ACTIVE_STATUSES } },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.key, c.count]));
  const lockedAmount = Number(totals._sum.amount ?? 0);

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">My Escrows</h1>
          <p className="mt-0.5 text-sm text-muted">{totals._count} active deal{totals._count !== 1 ? "s" : ""} · {formatCurrency(String(lockedAmount))} locked</p>
        </div>
        <Link
          href="/listings"
          className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand-300 hover:bg-brand-500/8"
        >
          Browse listings
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
        </Link>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-brand-100 dark:border-brand-900/50 bg-gradient-to-br from-brand-50 to-white dark:from-brand-950/30 dark:to-background px-4 py-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 mb-2">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z" clipRule="evenodd"/></svg>
          </div>
          <p className="text-2xl font-black text-brand-600 dark:text-brand-400">{countMap.ACTIVE ?? 0}</p>
          <p className="text-xs font-medium text-muted mt-0.5">Active</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-success/20 bg-gradient-to-br from-success/5 to-white dark:to-background px-4 py-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-success/10 text-success mb-2">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
          </div>
          <p className="text-2xl font-black text-success">{countMap.COMPLETED ?? 0}</p>
          <p className="text-xs font-medium text-muted mt-0.5">Completed</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-amber-100 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-background px-4 py-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 mb-2">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/></svg>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{formatCurrency(String(lockedAmount))}</p>
          <p className="text-xs font-medium text-muted mt-0.5">In escrow</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {STATUS_TABS.map((tab) => {
          const cnt = countMap[tab.key] ?? 0;
          const isActive = tabKey === tab.key;
          const href = tab.key === "ACTIVE" ? "/dashboard/escrows" : `/dashboard/escrows?tab=${tab.key}`;
          const isDisputed = tab.key === "DISPUTED";
          return (
            <Link
              key={tab.key}
              href={href}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? isDisputed ? "bg-danger text-white shadow-md shadow-danger/25" : "bg-brand-500 text-white shadow-md shadow-brand-500/25"
                  : "border border-surface-border bg-surface text-muted hover:text-foreground hover:border-brand-200"
              }`}
            >
              {tab.label}
              {cnt > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${
                  isActive
                    ? "bg-white/25 text-white"
                    : isDisputed ? "bg-danger/10 text-danger" : "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                }`}>
                  {cnt}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Escrow list */}
      {escrows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-surface-border py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-muted">
            <Shield className="h-8 w-8" strokeWidth={1.5} aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              {tabKey === "ACTIVE" ? "No active escrows" : `No ${activeTab.label.toLowerCase()} escrows`}
            </p>
            <p className="mt-1 text-xs text-muted">Your trades will appear here once started.</p>
          </div>
          {tabKey === "ACTIVE" && (
            <Link href="/listings" className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600 transition">
              Browse listings
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {escrows.map((escrow) => {
            const style = ESCROW_STATUS_STYLE[escrow.status];
            const isBuyer = escrow.buyerId === userId;
            const role = isBuyer ? "Buying" : "Selling";
            const counterparty = isBuyer
              ? (escrow.seller.username ?? escrow.seller.name)
              : (escrow.buyer.username ?? escrow.buyer.name);
            const platformColor = PLATFORM_COLOR[escrow.listing.platform as keyof typeof PLATFORM_COLOR] ?? "#888";
            const platformLabel = PLATFORM_LABEL[escrow.listing.platform as keyof typeof PLATFORM_LABEL] ?? escrow.listing.platform;
            const isUrgent = escrow.dispute !== null || escrow.status === "DISPUTED";

            return (
              <Link key={escrow.id} href={`/dashboard/escrows/${escrow.id}`} className="group block">
                <div
                  className={`relative overflow-hidden rounded-2xl border transition hover:shadow-md ${
                    isUrgent
                      ? "border-danger/30 bg-danger/5 hover:border-danger/50"
                      : "border-surface-border bg-background hover:border-brand-200"
                  }`}
                >
                  {/* Platform left accent bar */}
                  <div
                    className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
                    style={{ backgroundColor: platformColor }}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Platform avatar */}
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[11px] font-black text-white shadow-sm"
                        style={{ backgroundColor: platformColor }}
                      >
                        {platformLabel.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground group-hover:text-brand-600 transition">{escrow.listing.title}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span className={`text-xs font-semibold ${isBuyer ? "text-brand-600" : "text-emerald-600"}`}>
                            {isBuyer ? "Buying" : "Selling"}
                          </span>
                          <span className="text-xs text-muted">· with {counterparty}</span>
                          <span className="text-xs text-muted">· {relativeTime(escrow.createdAt)}</span>
                        </div>
                        {isUrgent && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-danger">
                            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                              <path fillRule="evenodd" d="M6.705 2.08C7.139 1.274 8.86 1.274 9.295 2.08l4.65 8.285a1.5 1.5 0 01-1.294 2.235H3.35A1.5 1.5 0 012.055 10.365l4.65-8.285zm1.296 4.17a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0V6.25zm0 5.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" clipRule="evenodd"/>
                            </svg>
                            Dispute {escrow.dispute?.status ?? "open"}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-base font-black text-foreground tabular-nums">{formatCurrency(escrow.amount.toString())}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${style.className}`}>
                          {style.label}
                        </span>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-surface-border bg-surface text-muted transition group-hover:border-brand-200 group-hover:text-brand-500">
                        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
