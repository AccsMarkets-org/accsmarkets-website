"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ActivityEventItem {
  id: string;
  type: string;
  metadata: Record<string, string>;
  isPublic: boolean;
  createdAt: string;
  user: { id: string; username: string | null; verifiedBadge: string; trustScore: number };
}

const EVENT_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  "listing.created":    { label: "listed an account",     icon: "📋", color: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400" },
  "escrow.sold":        { label: "completed a sale",       icon: "✅", color: "bg-success/10 text-success" },
  "escrow.purchased":   { label: "purchased an account",   icon: "🛍️", color: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" },
  "review.received":    { label: "received a review",      icon: "⭐", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  "listing.bumped":     { label: "bumped a listing",       icon: "⚡", color: "bg-brand-50 text-brand-600" },
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ActivityFeedPage() {
  const [events, setEvents] = useState<ActivityEventItem[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(p: number) {
    setLoading(true);
    if (p === 0) setError(null);
    try {
      const res = await fetch(`/api/activity-feed?page=${p}`);
      if (!res.ok) throw new Error("Failed to load activity feed");
      const data = await res.json();
      if (p === 0) {
        setEvents(data.events ?? []);
      } else {
        setEvents((prev) => [...prev, ...(data.events ?? [])]);
      }
      setHasMore((data.events?.length ?? 0) === data.pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Activity Feed</h1>
        <p className="mt-0.5 text-sm text-muted">Your activity and updates from sellers you follow.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {events.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-surface-border py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-border">
            <svg className="h-7 w-7 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div>
            <p className="font-medium text-foreground">No activity yet</p>
            <p className="mt-1 text-sm text-muted">Follow sellers to see their updates here.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {events.map((event) => {
          const config = EVENT_CONFIG[event.type];
          const initial = (event.user.username ?? "?")[0]?.toUpperCase();
          return (
            <Card key={event.id} className="flex items-start gap-4 transition hover:border-brand-300">
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {initial}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {event.user.username ?? "Unknown"}
                  </p>
                  <span className="text-[11px] text-muted">{relTime(event.createdAt)}</span>
                </div>

                <p className="mt-0.5 text-sm text-muted">
                  {config?.label ?? event.type}
                  {event.metadata.title && (
                    <span className="ml-1 font-medium text-foreground">— {event.metadata.title}</span>
                  )}
                  {event.metadata.amount && (
                    <span className="ml-1 text-success font-medium">
                      ${Number(event.metadata.amount).toLocaleString()}
                    </span>
                  )}
                </p>

                {/* Type badge */}
                {config && (
                  <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.color}`}>
                    {config.icon} {config.label}
                  </span>
                )}
              </div>
            </Card>
          );
        })}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            Loading…
          </div>
        )}
      </div>

      {hasMore && !loading && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              const next = page + 1;
              setPage(next);
              load(next);
            }}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
