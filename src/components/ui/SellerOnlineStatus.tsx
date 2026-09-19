"use client";

import { useEffect, useState } from "react";
import { relativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function SellerOnlineStatus({
  sellerId,
  initialLastSeenAt,
}: {
  sellerId: string;
  initialLastSeenAt: string | null;
}) {
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(initialLastSeenAt);
  const [, setTick] = useState(0);

  useEffect(() => {
    async function refresh() {
      try {
        const res = await fetch(`/api/users/${sellerId}/presence`);
        if (res.ok) {
          const data = await res.json();
          if (data.lastSeenAt) setLastSeenAt(data.lastSeenAt);
        }
      } catch { /* silent */ }
      setTick((n) => n + 1);
    }
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [sellerId]);

  const isOnline = lastSeenAt
    ? Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000
    : false;

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full shrink-0",
          isOnline ? "bg-success" : "bg-muted/40",
        )}
      />
      <span className={cn("font-medium", isOnline ? "text-success" : "text-foreground")}>
        {isOnline
          ? "Online now"
          : lastSeenAt
            ? relativeTime(lastSeenAt)
            : "—"}
      </span>
    </div>
  );
}
