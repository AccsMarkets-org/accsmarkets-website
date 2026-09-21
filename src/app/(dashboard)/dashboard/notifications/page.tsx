export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { cn, relativeTime } from "@/lib/utils";
import { NotificationsMarkAll } from "@/components/notifications/NotificationsMarkAll";
import { Bell, CircleAlert, CreditCard, Lock, MessageSquare, Shield, Tag, TrendingUp, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NOTIF_ICON: Record<string, LucideIcon> = {
  MESSAGE: MessageSquare,
  OFFER: Tag,
  ESCROW: Shield,
  PAYMENT: CreditCard,
  DEPOSIT_CONFIRMED: TrendingUp,
  SYSTEM: CircleAlert,
  DISPUTE: TriangleAlert,
  SECURITY: Lock,
};

function notifIcon(type: string): React.ReactNode {
  const Icon = NOTIF_ICON[type] ?? CircleAlert;
  return <Icon className="h-4 w-4" aria-hidden />;
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
            <Bell className="h-7 w-7 text-muted" strokeWidth={1.5} aria-hidden />
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
