import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/ui/AdminPagination";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDate, formatCurrency } from "@/lib/utils";
import { PLATFORM_LABEL, PLATFORM_COLOR } from "@/lib/constants";
import type { Platform, Prisma } from "@prisma/client";

const PAGE_SIZE = 30;

type DisputeRow = Prisma.DisputeGetPayload<{
  include: {
    escrow: {
      include: {
        listing: { select: { title: true; platform: true } };
        buyer: { select: { id: true; username: true; email: true } };
        seller: { select: { id: true; username: true; email: true } };
      };
    };
    evidence: { select: { id: true; userId: true } };
  };
}>;

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  OPEN:            { label: "Open",          className: "bg-danger/10 text-danger" },
  UNDER_REVIEW:    { label: "Under Review",  className: "bg-warning/10 text-warning" },
  RESOLVED_BUYER:  { label: "Buyer Won",     className: "bg-success/10 text-success" },
  RESOLVED_SELLER: { label: "Seller Won",    className: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400" },
  CLOSED:          { label: "Closed",        className: "bg-muted/10 text-muted" },
};

const TABS = ["OPEN", "UNDER_REVIEW", "RESOLVED_BUYER", "RESOLVED_SELLER", "CLOSED"] as const;
type TabStatus = typeof TABS[number];

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const session = await requireAdmin("MANAGE_DISPUTES");
  if (!session) redirect("/admin?denied=1");

  const status = (TABS.includes(searchParams.status as TabStatus) ? searchParams.status as TabStatus : "OPEN");
  const page = Math.max(0, Number(searchParams.page ?? 0));

  const [rawDisputes, tabCounts] = await Promise.all([
    prisma.dispute.findMany({
      where: { status },
      include: {
        escrow: {
          include: {
            listing: { select: { title: true, platform: true } },
            buyer: { select: { id: true, username: true, email: true } },
            seller: { select: { id: true, username: true, email: true } },
          },
        },
        evidence: { select: { id: true, userId: true } },
      },
      orderBy: status === "OPEN" || status === "UNDER_REVIEW" ? { createdAt: "asc" } : { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE + 1,
    }),
    prisma.dispute.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const hasMore = rawDisputes.length > PAGE_SIZE;
  const disputes: DisputeRow[] = hasMore ? rawDisputes.slice(0, PAGE_SIZE) : rawDisputes;

  const countMap: Record<string, number> = {};
  for (const row of tabCounts) countMap[row.status] = row._count._all;
  const openCount = (countMap["OPEN"] ?? 0) + (countMap["UNDER_REVIEW"] ?? 0);

  const now = Date.now();

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        title="Disputes"
        badge={openCount}
        badgeUrgent={openCount > 0}
        subtitle="Manage buyer / seller disputes"
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const count = countMap[t] ?? 0;
          const active = t === status;
          return (
            <Link
              key={t}
              href={`/admin/disputes?status=${t}`}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                active ? "bg-brand-500 text-white" : "border border-surface-border bg-surface text-muted hover:text-foreground hover:border-brand-300"
              }`}
            >
              {STATUS_STYLE[t].label}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  active ? "bg-white/20 text-white" : t === "OPEN" ? "bg-danger text-white" : "bg-surface-border text-muted"
                }`}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {disputes.length === 0 ? (
        <div className="py-16 text-center text-muted">No {STATUS_STYLE[status].label.toLowerCase()} disputes.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {disputes.map((d) => {

            const ageDays = Math.floor((now - new Date(d.createdAt).getTime()) / 86_400_000);
            const isUrgent = (status === "OPEN") && ageDays > 5;
            const isUnderReview = status === "UNDER_REVIEW";
            const platformColor = PLATFORM_COLOR[d.escrow.listing.platform as Platform];
            const evidenceCount = d.evidence.length;

            return (
              <div
                key={d.id}
                className={`rounded-2xl border p-4 transition ${
                  isUrgent
                    ? "border-danger/30 bg-danger/5"
                    : isUnderReview
                    ? "border-warning/30 bg-warning/5"
                    : "border-surface-border bg-surface"
                }`}
              >
                <div className="flex flex-wrap items-start gap-4 justify-between">
                  {/* Left: listing + parties */}
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ background: `${platformColor}18`, color: platformColor }}
                      >
                        {PLATFORM_LABEL[d.escrow.listing.platform as Platform] ?? d.escrow.listing.platform}
                      </span>
                      <Link href={`/admin/disputes/${d.id}`} className="font-semibold hover:text-brand-600 transition">
                        {d.escrow.listing.title}
                      </Link>
                    </div>

                    <p className="text-lg font-bold">{formatCurrency(d.escrow.totalCharged.toString())}</p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span>
                        Buyer:{" "}
                        <Link href={`/admin/users/${d.escrow.buyer.id}`} className="text-brand-500 hover:underline">
                          {d.escrow.buyer.username ?? d.escrow.buyer.email}
                        </Link>
                      </span>
                      <span>vs</span>
                      <span>
                        Seller:{" "}
                        <Link href={`/admin/users/${d.escrow.seller.id}`} className="text-brand-500 hover:underline">
                          {d.escrow.seller.username ?? d.escrow.seller.email}
                        </Link>
                      </span>
                    </div>
                  </div>

                  {/* Center: evidence + age */}
                  <div className="flex flex-col items-start gap-1.5">
                    {/* Evidence count */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted">Evidence:</span>
                      <span className={`font-medium ${evidenceCount > 0 ? "text-foreground" : "text-muted"}`}>
                        {evidenceCount}/2
                      </span>
                      {evidenceCount < 2 && (status === "OPEN" || status === "UNDER_REVIEW") && (
                        <span className="rounded-full bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                          Incomplete
                        </span>
                      )}
                    </div>

                    {/* Age badge */}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isUrgent ? "bg-danger/10 text-danger" : "bg-muted/10 text-muted"
                      }`}
                    >
                      {status === "OPEN" || status === "UNDER_REVIEW"
                        ? `Open ${ageDays}d`
                        : formatDate(d.createdAt)}
                    </span>
                  </div>

                  {/* Right: status + action */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusPill label={STATUS_STYLE[d.status].label} className={STATUS_STYLE[d.status].className} />
                    <Link
                      href={`/admin/disputes/${d.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 transition"
                    >
                      Review
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <AdminPagination
        page={page}
        hasMore={hasMore}
        baseHref="/admin/disputes"
        extraParams={{ status }}
      />
    </div>
  );
}
