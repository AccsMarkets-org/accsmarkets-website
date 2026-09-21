import Link from "next/link";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/ui/AdminPagination";
import { StatusPill } from "@/components/ui/StatusPill";
import { ESCROW_STATUS_STYLE } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { EscrowStatus } from "@prisma/client";

const PAGE_SIZE = 30;

const ACTIVE_STATUSES: EscrowStatus[] = ["FUNDED", "AWAITING_MANAGER_ADD", "PENDING_VERIFICATION", "SUBMITTED", "VERIFIED", "IN_TRANSFER"];

const TABS = [
  { key: "active",    label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "disputed",  label: "Disputed" },
  { key: "all",       label: "All" },
] as const;
type TabKey = typeof TABS[number]["key"];

export default async function AdminEscrowsPage({
  searchParams,
}: {
  searchParams: { tab?: string; page?: string; q?: string };
}) {
  const tabKey = (TABS.find((t) => t.key === (searchParams.tab ?? "active"))?.key ?? "active") as TabKey;
  const page = Math.max(0, Number(searchParams.page ?? 0));
  const q = searchParams.q?.trim() ?? "";

  const statusFilter: EscrowStatus[] | undefined =
    tabKey === "active" ? ACTIVE_STATUSES
    : tabKey === "completed" ? ["COMPLETED"]
    : tabKey === "disputed" ? ["DISPUTED"]
    : undefined;

  const where = {
    ...(statusFilter ? { status: { in: statusFilter } } : {}),
    ...(q ? { listing: { title: { contains: q } } } : {}),
  };

  const [escrows, tabCounts] = await Promise.all([
    prisma.escrow.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      include: {
        listing: { select: { title: true } },
        buyer: { select: { id: true, username: true, email: true } },
        seller: { select: { id: true, username: true, email: true } },
        dispute: { select: { id: true, status: true } },
      },
    }),
    prisma.escrow.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const hasMore = escrows.length > PAGE_SIZE;
  const pageEscrows = hasMore ? escrows.slice(0, PAGE_SIZE) : escrows;

  const statusCount: Record<string, number> = {};
  for (const r of tabCounts) statusCount[r.status] = r._count._all;
  const activeCount = ACTIVE_STATUSES.reduce((s, st) => s + (statusCount[st] ?? 0), 0);
  const disputedCount = statusCount["DISPUTED"] ?? 0;

  function tabCount(key: TabKey): number {
    if (key === "active") return activeCount;
    if (key === "completed") return statusCount["COMPLETED"] ?? 0;
    if (key === "disputed") return disputedCount;
    return Object.values(statusCount).reduce((s, c) => s + c, 0);
  }

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        title="Escrows"
        badge={disputedCount}
        badgeUrgent={disputedCount > 0}
        subtitle={`${activeCount} active · ${disputedCount} disputed`}
      />

      {/* Search + tabs */}
      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search listing title…"
          className="h-9 flex-1 min-w-[160px] rounded-xl border border-surface-border bg-surface px-3 text-sm focus:border-brand-400 focus:outline-none"
        />
        {tabKey !== "all" && <input type="hidden" name="tab" value={tabKey} />}
        <button className="h-9 rounded-xl bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 transition">
          Search
        </button>
      </form>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TABS.map((t) => {
          const count = tabCount(t.key);
          const active = t.key === tabKey;
          const qs = new URLSearchParams();
          qs.set("tab", t.key);
          if (q) qs.set("q", q);
          return (
            <Link
              key={t.key}
              href={`/admin/escrows?${qs}`}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition ${
                active ? "bg-brand-500 text-white" : "border border-surface-border bg-surface text-muted hover:text-foreground hover:border-brand-300"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  active ? "bg-white/20 text-white" : t.key === "disputed" ? "bg-danger text-white" : "bg-surface-border text-muted"
                }`}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-2">
        {pageEscrows.map((escrow) => {
          const style = ESCROW_STATUS_STYLE[escrow.status];
          const isDisputed = !!escrow.dispute;
          return (
            <div
              key={escrow.id}
              className={`rounded-2xl border p-4 transition ${
                isDisputed ? "border-danger/30 bg-danger/5" : "border-surface-border bg-surface"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/escrows/${escrow.id}`} className="font-semibold hover:text-brand-600 transition">
                      {escrow.listing.title}
                    </Link>
                    <StatusPill label={style.label} className={style.className} />
                    {escrow.isHighValue && (
                      <span className="rounded-full bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        High Value
                      </span>
                    )}

                  </div>

                  <div className="text-sm">
                    <span className="font-semibold">{formatCurrency(escrow.amount.toString())}</span>
                    <span className="text-muted"> + {formatCurrency(escrow.feeAmount.toString())} fee</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span>
                      Buyer:{" "}
                      <Link href={`/admin/users/${escrow.buyer.id}`} className="text-brand-500 hover:underline">
                        {escrow.buyer.username ?? escrow.buyer.email}
                      </Link>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    <span>
                      Seller:{" "}
                      <Link href={`/admin/users/${escrow.seller.id}`} className="text-brand-500 hover:underline">
                        {escrow.seller.username ?? escrow.seller.email}
                      </Link>
                    </span>
                    <span>{formatDate(escrow.createdAt)}</span>
                  </div>

                  {escrow.dispute && (
                    <div className="flex items-center gap-1.5 text-xs text-danger">
                      <span className="inline-flex items-center gap-1.5">
                        <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
                        Disputed
                      </span>
                      <span className="rounded-full bg-danger/10 px-2 py-0.5 font-medium">{escrow.dispute.status}</span>
                      <Link href={`/admin/disputes/${escrow.dispute.id}`} className="inline-flex items-center gap-1.5 text-brand-500 hover:underline">
                        View dispute
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </div>
                  )}
                </div>

                <Link
                  href={`/admin/escrows/${escrow.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border px-4 py-1.5 text-sm font-medium hover:bg-brand-500/8 hover:border-brand-300 transition shrink-0"
                >
                  Open
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          );
        })}
        {pageEscrows.length === 0 && (
          <div className="py-16 text-center text-muted">No escrows found.</div>
        )}
      </div>

      <AdminPagination page={page} hasMore={hasMore} baseHref="/admin/escrows" extraParams={{ tab: tabKey, q: q || undefined }} />
    </div>
  );
}
