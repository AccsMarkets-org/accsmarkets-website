import { CircleCheck, ClipboardList, Pin, ShoppingBag, Star, Zap, type LucideIcon } from "lucide-react";


interface ActivityUser {
  username: string | null;
  name: string | null;
  image: string | null;
}

interface ActivityEvent {
  id: string;
  eventType: string;
  metadata: unknown;
  createdAt: Date;
  user: ActivityUser;
}

const EVENT_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  "listing.created":   { label: "listed an account for sale",  icon: ClipboardList, color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  "escrow.sold":       { label: "completed a sale",            icon: CircleCheck, color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  "escrow.purchased":  { label: "purchased an account",        icon: ShoppingBag, color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  "review.received":   { label: "received a 5-star review",   icon: Star, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  "listing.bumped":    { label: "bumped a listing",            icon: Zap, color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
};

function relativeTime(date: Date): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

export function ActivityFeedCard({ event }: { event: ActivityEvent }) {
  const config = EVENT_CONFIG[event.eventType] ?? {
    label: event.eventType,
    icon: Pin,
    color: "bg-surface text-muted",
  };

  const displayName = event.user.username ?? event.user.name ?? "User";
  const meta = event.metadata as Record<string, string> | null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-surface-border bg-surface p-4 shadow-sm">
      {/* Avatar */}
      <div className="shrink-0">
        {event.user.image ? (
          <img
            src={event.user.image}
            alt={displayName}
            className="h-10 w-10 rounded-full object-cover border border-surface-border"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-base font-bold text-brand-700">
            {displayName[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          <span className="font-semibold">{displayName}</span>
          {" "}
          <span className="text-muted">{config.label}</span>
        </p>
        {meta?.title && (
          <p className="mt-0.5 text-xs text-muted truncate">{meta.platform ? `${meta.platform} · ` : ""}{meta.title}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${config.color}`}>
            <config.icon className="h-3 w-3" aria-hidden />
            {config.label.split(" ")[0]}
          </span>
          <span className="text-[11px] text-muted">{relativeTime(event.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
