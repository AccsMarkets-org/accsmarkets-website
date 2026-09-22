"use client";

import { useState } from "react";
import { ListingViewsChart } from "@/components/ui/ListingViewsChart";
import { Button } from "@/components/ui/Button";
import { PromoteModal } from "@/components/listings/PromoteModal";
import { Zap } from "lucide-react";

interface ChartProps {
  byDay: { date: string; views: number; unique: number }[];
}

/** 30-day chart with a total / unique toggle, reusing the dashboard's line chart. */
export function ListingAnalyticsChart({ byDay }: ChartProps) {
  const [series, setSeries] = useState<"views" | "unique">("views");
  const days = byDay.map((d) => d.date);
  const points = byDay.map((d) => (series === "views" ? d.views : d.unique));
  const total = points.reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-1 pb-2">
        <p className="text-xs text-muted">
          <span className="font-semibold text-foreground">{total.toLocaleString()}</span>{" "}
          {series === "views" ? "views" : "unique visitors"} in the last 30 days
        </p>
        <div className="flex rounded-lg border border-surface-border p-0.5 text-xs">
          {(["views", "unique"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSeries(k)}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                series === k ? "bg-brand-500 text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {k === "views" ? "Total" : "Unique"}
            </button>
          ))}
        </div>
      </div>
      <ListingViewsChart points={points} days={days} />
    </div>
  );
}

interface CtaProps {
  listingId: string;
  status: string;
  boosted: boolean;
}

/** "Boost this listing" call-to-action shown when the listing isn't promoted. */
export function BoostCta({ listingId, status, boosted }: CtaProps) {
  const [open, setOpen] = useState(false);
  if (boosted || status !== "ACTIVE") return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand-300 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-brand-700 dark:bg-brand-950/30">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-400">
          <Zap className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">Boost this listing</p>
          <p className="text-xs text-muted">
            Featured and pinned listings sit above regular results and typically see several times more views.
          </p>
        </div>
      </div>
      <Button size="sm" onClick={() => setOpen(true)} className="shrink-0">
        <Zap className="h-4 w-4" aria-hidden />
        Boost now
      </Button>
      {open && <PromoteModal listingId={listingId} onClose={() => setOpen(false)} />}
    </div>
  );
}
