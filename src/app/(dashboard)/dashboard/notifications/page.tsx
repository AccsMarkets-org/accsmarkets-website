export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { cn, relativeTime } from "@/lib/utils";
import { NotificationsMarkAll } from "@/components/notifications/NotificationsMarkAll";

function notifIcon(type: string): React.ReactNode {
  const map: Record<string, React.ReactNode> = {
    MESSAGE: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
    OFFER: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
        <line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
    ),
    ESCROW: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    PAYMENT: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
      </svg>
    ),
    DEPOSIT_CONFIRMED: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
    SYSTEM: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    DISPUTE: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    SECURITY: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    ),
  };
  return map[type] ?? map.SYSTEM;
}

function notifColor(type: string): string {
  const map: Record<string, string> = {
    MESSAGE: "bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400",
    OFFER: "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    ESCROW: "bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
    PAYMENT: "bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400",
    DEPOSIT_CONFIRMED: "bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400",
    SYSTEM: "bg-surface-border text-muted",
    DISPUTE: "bg-danger/10 text-danger",
    SECURITY: "bg-danger/10 text-danger",
  };
  return map[type] ?? "bg-surface-border text-muted";
}

function groupByDate<T extends { createdAt: Date }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400_000).toDateString();
  for (const item of items) {
    const ds = new Date(item.createdAt).toDateString();
    const label = ds === today ? "Today" : ds === yesterday ? "Yesterday" : new Date(item.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric" });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return map;
}

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  const groups = groupByDate(notifications);

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="mt-0.5 text-sm text-muted">
            {notifications.length} total
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        {unreadCount > 0 && <NotificationsMarkAll />}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-surface-border py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-border">
            <svg className="h-7 w-7 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          </div>
          <p className="text-sm text-muted">No notifications yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {[...groups.entries()].map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted/60">{dateLabel}</p>
              <Card className="overflow-hidden p-0">
                {items.map((n, i) => (
                  <Link
                    key={n.id}
                    href={n.link ?? "#"}
                    className={cn(
                      "flex items-start gap-3 px-5 py-4 transition hover:bg-brand-500/8",
                      i > 0 && "border-t border-surface-border",
                      !n.isRead && "bg-brand-500/10",
                    )}
                  >
                    {/* Icon */}
                    <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", notifColor(n.type))}>
                      {notifIcon(n.type)}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={cn("text-sm leading-snug", n.isRead ? "text-foreground" : "font-semibold text-foreground")}>
                          {n.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-muted">{relativeTime(n.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted line-clamp-2">{n.body}</p>
                    </div>

                    {/* Unread dot */}
                    {!n.isRead && (
                      <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                    )}
                  </Link>
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
