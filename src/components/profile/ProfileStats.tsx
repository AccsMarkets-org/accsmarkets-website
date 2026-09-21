import { Star } from "lucide-react";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface ProfileStatsProps {
  followers: number;
  sales: number;
  listings: number;
  avgRating: number | null;
  reviewCount: number;
}

export function ProfileStats({ followers, sales, listings, avgRating, reviewCount }: ProfileStatsProps) {
  const stats = [
    { label: "Followers", value: fmt(followers) },
    { label: "Sales", value: fmt(sales) },
    { label: "Listings", value: fmt(listings) },
    {
      label: "Rating",
      value: avgRating !== null ? (
        <span className="inline-flex items-center gap-1">
          {avgRating.toFixed(1)}
          <Star className="h-3.5 w-3.5 fill-current text-amber-500" aria-hidden />
        </span>
      ) : "—",
      sub: reviewCount > 0 ? `${reviewCount} review${reviewCount !== 1 ? "s" : ""}` : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-surface-border border-t border-b border-surface-border bg-surface/40 py-3">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col items-center gap-0.5 px-2 py-1.5 sm:py-0 text-center">
          <span className="text-base font-bold text-foreground tabular-nums">{s.value}</span>
          <span className="text-[10px] text-muted leading-tight">{s.label}</span>
          {s.sub && <span className="text-[9px] text-muted/70">{s.sub}</span>}
        </div>
      ))}
    </div>
  );
}
