export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn, formatCurrency, formatDate, relativeTime } from "@/lib/utils";
import { PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/constants";
import { PHASE_COLORS, PHASE_LABELS } from "@/lib/dispute-phases";
import { ACTIVE_DISPUTE_STATUSES, DISPUTE_STATUS_STYLE } from "@/components/disputes/constants";
import { ChevronRight, Clock, LifeBuoy, Scale } from "lucide-react";

const TABS = [
  { key: "active", label: "Active" },
  { key: "closed", label: "Closed" },
  { key: "all",    label: "All" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export const metadata = { title: "Disputes" };

export default async function DisputesPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const tab: TabKey = (TABS.map((t) => t.key) as string[]).includes(searchParams.tab ?? "") ? (searchParams.tab as TabKey) : "active";
  const participant = { escrow: { OR: [{ buyerId: userId }, { sellerId: userId }] } };
  const statusWhere =
    tab === "active" ? { status: { in: ACTIVE_DISPUTE_STATUSES } }
    : tab === "closed" ? { status: { notIn: ACTIVE_DISPUTE_STATUSES } }
    : {};

  const [disputes, activeCount, closedCount, allCount] = await Promise.all([
    prisma.dispute.findMany({
      where: { ...participant, ...statusWhere },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, status: true, phase: true, evidenceDeadline: true, createdAt: true, openedById: true,
        escrow: {
          select: {
            id: true, amount: true, buyerId: true, sellerId: true,
            listing: { select: { title: true, platform: true } },
            buyer: { select: { username: true, name: true } },
            seller: { select: { username: true, name: true } },
          },
        },
        evidence: { where: { userId }, select: { id: true }, take: 1 },
      },
    }),
    prisma.dispute.count({ where: { ...participant, status: { in: ACTIVE_DISPUTE_STATUSES } } }),
    prisma.dispute.count({ where: { ...participant, status: { notIn: ACTIVE_DISPUTE_STATUSES } } }),
    prisma.dispute.count({ where: participant }),
  ]);
  const counts: Record<TabKey, number> = { active: activeCount, closed: closedCount, all: allCount };

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Disputes</h1>
          <p className="mt-0.5 text-sm text-muted">{activeCount} active dispute{activeCount !== 1 ? "s" : ""} · our team reviews every case</p>
        </div>
        <Link
          href="/dashboard/support/new?category=ESCROW"
          className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand-300 hover:bg-brand-500/8"
        >
          <LifeBuoy className="h-3.5 w-3.5" aria-hidden />
          Get help
        </Link>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TABS.map((t) => {
          const active = tab === t.key;
          const href = t.key === "active" ? "/dashboard/disputes" : `/dashboard/disputes?tab=${t.key}`;
          return (
            <Link
              key={t.key}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition",
                active ? "bg-danger text-white shadow-md shadow-danger/25" : "border border-surface-border bg-surface text-muted hover:border-brand-200 hover:text-foreground",
              )}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none", active ? "bg-white/25 text-white" : "bg-danger/10 text-danger")}>
                  {counts[t.key]}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {disputes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-surface-border py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-muted">
            <Scale className="h-8 w-8" strokeWidth={1.5} aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{tab === "active" ? "No active disputes" : "No disputes here"}</p>
            <p className="mt-1 text-xs text-muted">Disputes you open — or that are opened against you — on an escrow will show up here.</p>
          </div>
          <Link href="/dashboard/escrows" className="text-sm font-semibold text-brand-500 hover:underline">View my escrows</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {disputes.map((d) => {
            const isBuyer = d.escrow.buyerId === userId;
            const other = isBuyer ? d.escrow.seller : d.escrow.buyer;
            const counterparty = other.username ?? other.name ?? "Counterparty";
            const platformColor = PLATFORM_COLOR[d.escrow.listing.platform as keyof typeof PLATFORM_COLOR] ?? "#888";
            const platformLabel = PLATFORM_LABEL[d.escrow.listing.platform as keyof typeof PLATFORM_LABEL] ?? d.escrow.listing.platform;
            const st = DISPUTE_STATUS_STYLE[d.status];
            const isActive = ACTIVE_DISPUTE_STATUSES.includes(d.status);
            const needsEvidence = isActive && d.phase === "EVIDENCE" && d.evidence.length === 0;
            const deadlineSoon = d.evidenceDeadline && d.phase === "EVIDENCE" && d.evidenceDeadline.getTime() > Date.now();

            return (
              <Link key={d.id} href={`/dashboard/disputes/${d.id}`} className="group block">
                <div className={cn(
                  "relative overflow-hidden rounded-2xl border transition hover:shadow-md",
                  isActive ? "border-danger/30 bg-danger/5 hover:border-danger/50" : "border-surface-border bg-background hover:border-brand-200",
                )}>
                  <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl" style={{ backgroundColor: platformColor }} />
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[11px] font-black text-white shadow-sm" style={{ backgroundColor: platformColor }}>
                        {platformLabel.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground transition group-hover:text-brand-600">{d.escrow.listing.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                          <span className={cn("font-semibold", isBuyer ? "text-brand-600" : "text-emerald-600")}>{isBuyer ? "Buying" : "Selling"}</span>
                          <span>· with {counterparty}</span>
                          <span>· {d.openedById === userId ? "opened by you" : `opened by ${counterparty}`} {relativeTime(d.createdAt)}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", PHASE_COLORS[d.phase])}>{PHASE_LABELS[d.phase]}</span>
                          {needsEvidence && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">Your evidence needed</span>}
                          {deadlineSoon && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted">
                              <Clock className="h-3 w-3" aria-hidden />
                              Evidence by {formatDate(d.evidenceDeadline!)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="text-base font-black tabular-nums text-foreground">{formatCurrency(d.escrow.amount.toString())}</p>
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold", st.className)}>{st.label}</span>
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
