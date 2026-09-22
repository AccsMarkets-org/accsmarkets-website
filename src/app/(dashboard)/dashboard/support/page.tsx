export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn, relativeTime } from "@/lib/utils";
import { CATEGORY_LABEL, CLOSED_TICKET_STATUSES, OPEN_TICKET_STATUSES, TICKET_STATUS_STYLE } from "@/components/support/constants";
import { ChevronRight, LifeBuoy, Plus, Scale } from "lucide-react";
import type { Prisma } from "@prisma/client";

const TABS = [
  { key: "open",     label: "Open" },
  { key: "resolved", label: "Resolved" },
  { key: "all",      label: "All" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export const metadata = { title: "Support" };

export default async function SupportPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const tab: TabKey = (TABS.map((t) => t.key) as string[]).includes(searchParams.tab ?? "") ? (searchParams.tab as TabKey) : "open";
  const statusWhere: Prisma.SupportTicketWhereInput =
    tab === "open" ? { status: { in: OPEN_TICKET_STATUSES } }
    : tab === "resolved" ? { status: { in: CLOSED_TICKET_STATUSES } }
    : {};

  const [tickets, openCount, resolvedCount, allCount] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { userId, ...statusWhere },
      orderBy: { lastReplyAt: "desc" },
      take: 100,
      select: {
        id: true, number: true, subject: true, category: true, status: true, lastReplyAt: true, createdAt: true,
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { isStaff: true, body: true, createdAt: true },
        },
      },
    }),
    prisma.supportTicket.count({ where: { userId, status: { in: OPEN_TICKET_STATUSES } } }),
    prisma.supportTicket.count({ where: { userId, status: { in: CLOSED_TICKET_STATUSES } } }),
    prisma.supportTicket.count({ where: { userId } }),
  ]);
  const counts: Record<TabKey, number> = { open: openCount, resolved: resolvedCount, all: allCount };

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Support</h1>
          <p className="mt-0.5 text-sm text-muted">
            {openCount} open ticket{openCount !== 1 ? "s" : ""} · we reply within 24–48 hours
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/disputes"
            className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand-300 hover:bg-brand-500/8"
          >
            <Scale className="h-3.5 w-3.5" aria-hidden />
            Disputes
          </Link>
          <Link
            href="/dashboard/support/new"
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-brand-500/25 transition hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            New ticket
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TABS.map((t) => {
          const active = tab === t.key;
          const href = t.key === "open" ? "/dashboard/support" : `/dashboard/support?tab=${t.key}`;
          return (
            <Link
              key={t.key}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition",
                active
                  ? "bg-brand-500 text-white shadow-md shadow-brand-500/25"
                  : "border border-surface-border bg-surface text-muted hover:border-brand-200 hover:text-foreground",
              )}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none", active ? "bg-white/25 text-white" : "bg-brand-500/10 text-brand-600 dark:text-brand-400")}>
                  {counts[t.key]}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-surface-border py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-muted">
            <LifeBuoy className="h-8 w-8" strokeWidth={1.5} aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{tab === "open" ? "No open tickets" : "Nothing here yet"}</p>
            <p className="mt-1 text-xs text-muted">Need a hand with an escrow, payment or your account? Open a ticket and we&apos;ll get back to you.</p>
          </div>
          <Link href="/dashboard/support/new" className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-600">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            Open a ticket
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {tickets.map((t) => {
            const last = t.messages[0];
            // Staff replied after the user's last message.
            const unread = last?.isStaff === true;
            const style = TICKET_STATUS_STYLE[t.status];
            return (
              <Link key={t.id} href={`/dashboard/support/${t.id}`} className="group block">
                <div
                  className={cn(
                    "relative flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 transition hover:shadow-md sm:px-5",
                    unread ? "border-brand-300 bg-brand-500/5 hover:border-brand-400" : "border-surface-border bg-background hover:border-brand-200",
                  )}
                >
                  {unread && <span className="absolute left-0 top-0 h-full w-1 bg-brand-500" aria-hidden />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono text-xs font-bold text-muted">#{t.number}</span>
                      <p className={cn("truncate text-sm text-foreground transition group-hover:text-brand-600", unread ? "font-bold" : "font-semibold")}>{t.subject}</p>
                      {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="New reply" />}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                      <span className="rounded-md bg-surface px-1.5 py-0.5 font-medium">{CATEGORY_LABEL[t.category]}</span>
                      <span>·</span>
                      <span>{last?.isStaff ? "Support" : "You"}: {last ? last.body.slice(0, 80) : "—"}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold", style.className)}>{style.userLabel}</span>
                    <span className="text-[10px] text-muted">{relativeTime(t.lastReplyAt)}</span>
                  </div>
                  <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted transition group-hover:text-brand-500 sm:block" aria-hidden />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
