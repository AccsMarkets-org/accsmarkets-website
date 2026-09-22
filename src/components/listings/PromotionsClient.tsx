"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/hooks/useConfirm";
import { PromoteModal } from "@/components/listings/PromoteModal";
import { PLATFORM_COLOR, PLATFORM_LABEL, LISTING_STATUS_STYLE } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import type { ListingStatus, Platform } from "@prisma/client";
import { ArrowUpCircle, Clock, Pin, Sparkles, Star, XCircle, Zap } from "lucide-react";

export interface BoostedListingRow {
  id: string;
  title: string;
  platform: Platform;
  status: ListingStatus;
  viewCount: number;
  isFeatured: boolean;
  isPremiumFeatured: boolean;
  isPinned: boolean;
  /** ISO strings — serialised on the server. */
  featuredUntil: string | null;
  pinnedUntil: string | null;
  lastBumpedAt: string | null;
}

interface Props {
  rows: BoostedListingRow[];
}

function daysLeft(until: string | null): number | null {
  if (!until) return null;
  return Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 86400_000));
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function DaysPill({ days }: { days: number | null }) {
  if (days === null) return <span className="text-xs text-muted">no expiry</span>;
  const tone =
    days <= 1 ? "bg-danger/10 text-danger" : days <= 3 ? "bg-warning/10 text-warning" : "bg-success/10 text-success";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      <Clock className="h-3 w-3" aria-hidden />
      {days === 0 ? "ends today" : `${days}d left`}
    </span>
  );
}

export function PromotionsClient({ rows }: Props) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [extendFor, setExtendFor] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function cancelBoost(row: BoostedListingRow) {
    const ok = await confirm({
      title: "Cancel this boost?",
      description:
        "All active promotions on this listing will be removed immediately. Promotion purchases are final — the unused time is NOT refunded.",
      confirmLabel: "Cancel boost (no refund)",
      destructive: true,
    });
    if (!ok) return;
    setCancelling(row.id);
    try {
      const res = await fetch(`/api/listings/${row.id}/promotions/cancel`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to cancel boost");
      }
      toast.success("Boost cancelled");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCancelling(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-surface-border py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950/30">
          <Zap className="h-7 w-7 text-brand-400" strokeWidth={1.5} aria-hidden />
        </div>
        <div>
          <p className="font-semibold text-foreground">No active boosts</p>
          <p className="mt-1 text-sm text-muted">
            Featured, premium and pinned listings appear above regular results and get more views.
          </p>
        </div>
        <Link
          href="/dashboard/listings?status=ACTIVE"
          className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Boost a listing
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const platformColor = PLATFORM_COLOR[row.platform];
        const platformLabel = PLATFORM_LABEL[row.platform];
        const statusStyle = LISTING_STATUS_STYLE[row.status];
        const boosts: { key: string; label: string; icon: React.ReactNode; until: string | null }[] = [];
        if (row.isPremiumFeatured) boosts.push({ key: "premium", label: "Premium Featured", icon: <Sparkles className="h-3.5 w-3.5" aria-hidden />, until: row.featuredUntil });
        else if (row.isFeatured) boosts.push({ key: "featured", label: "Featured", icon: <Star className="h-3.5 w-3.5" aria-hidden />, until: row.featuredUntil });
        if (row.isPinned) boosts.push({ key: "pinned", label: "Pinned", icon: <Pin className="h-3.5 w-3.5" aria-hidden />, until: row.pinnedUntil });

        const canExtend = row.status === "ACTIVE";

        return (
          <div key={row.id} className="rounded-2xl border border-surface-border bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: `${platformColor}18`, color: platformColor }}
                  >
                    {platformLabel}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle.className}`}>
                    {statusStyle.label}
                  </span>
                  <span className="text-[11px] text-muted">{formatNumber(row.viewCount)} views</span>
                </div>
                <Link
                  href={`/dashboard/listings/${row.id}/analytics`}
                  className="block truncate text-sm font-semibold text-foreground hover:text-brand-600 transition"
                >
                  {row.title}
                </Link>

                <div className="mt-2 flex flex-col gap-1.5">
                  {boosts.map((b) => (
                    <div key={b.key} className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-2 py-0.5 font-semibold text-white">
                        {b.icon}
                        {b.label}
                      </span>
                      <span suppressHydrationWarning><DaysPill days={daysLeft(b.until)} /></span>
                      <span className="text-muted" suppressHydrationWarning>expires {fmtDate(b.until)}</span>
                    </div>
                  ))}
                  {row.lastBumpedAt && (
                    <div className="flex items-center gap-1.5 text-xs text-muted" suppressHydrationWarning>
                      <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden />
                      Last bumped {fmtDate(row.lastBumpedAt)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {canExtend && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExtendFor(row.id)}
                    className="border-brand-300 text-brand-600 hover:bg-brand-500/8"
                  >
                    <Zap className="h-4 w-4" aria-hidden />
                    Extend
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={cancelling === row.id}
                  onClick={() => cancelBoost(row)}
                  className="border-danger/40 text-danger hover:bg-danger/8"
                >
                  <XCircle className="h-4 w-4" aria-hidden />
                  Cancel boost
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      {extendFor && <PromoteModal listingId={extendFor} onClose={() => setExtendFor(null)} />}
      {ConfirmDialog}
    </div>
  );
}
