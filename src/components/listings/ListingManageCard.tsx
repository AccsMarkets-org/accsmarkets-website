"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { Button } from "@/components/ui/Button";
import {
  LISTING_STATUS_STYLE,
  PLATFORM_LABEL,
  PLATFORM_COLOR,
  ADSENSE_STATUS_STYLE,
  standingLabel,
  standingPillClass,
} from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { PromoteModal } from "@/components/listings/PromoteModal";
import type { Listing } from "@prisma/client";

type ListingWithCounts = Listing & {
  _count?: { offers: number; bids: number };
};

interface Props {
  listing: ListingWithCounts;
  pendingOfferCount?: number;
  bidCount?: number;
}

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── small icon components ─────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function CheckShieldIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export function ListingManageCard({ listing, pendingOfferCount = 0, bidCount = 0 }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const screenshots = Array.isArray(listing.screenshots)
    ? (listing.screenshots as string[])
    : [];
  const style = LISTING_STATUS_STYLE[listing.status];
  const canEdit = ["DRAFT", "PENDING", "REJECTED", "ACTIVE"].includes(listing.status);
  const canDelete = ["DRAFT", "PENDING", "REJECTED", "EXPIRED"].includes(listing.status);
  const canPromote = listing.status === "ACTIVE";
  const isAuction = listing.saleType === "AUCTION";
  const platformColor = PLATFORM_COLOR[listing.platform];
  const platformLabel = PLATFORM_LABEL[listing.platform];

  // Promo badges
  const promoBadges: string[] = [];
  if (listing.isPremiumFeatured) promoBadges.push("Premium");
  else if (listing.isFeatured) promoBadges.push("Featured");
  if (listing.isPinned) promoBadges.push("Pinned");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (screenshots.length >= 8) { toast.error("Maximum 8 screenshots"); return; }
    setUploading(true);
    try {
      const dataUri = await fileToDataUri(file);
      const uploadRes = await fetch("/api/upload/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUri }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? "Upload failed");

      const patchRes = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenshots: [...screenshots, uploadData.url] }),
      });
      if (!patchRes.ok) throw new Error("Failed to save screenshot");
      toast.success("Screenshot added");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Delete listing?",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Listing deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  // Auction countdown
  let auctionLabel = "";
  if (isAuction && listing.auctionEndsAt) {
    const diff = new Date(listing.auctionEndsAt).getTime() - Date.now();
    if (diff > 0) {
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      auctionLabel = h > 48 ? `${Math.floor(h / 24)}d left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
    } else {
      auctionLabel = "Ended";
    }
  }

  return (
    <div className="rounded-2xl border border-surface-border bg-surface shadow-card overflow-hidden">
      <div className="flex gap-0">
        {/* Thumbnail */}
        <div
          className="relative shrink-0 w-[120px] sm:w-[160px] self-stretch flex items-center justify-center overflow-hidden"
          style={{ background: `${platformColor}18` }}
        >
          {screenshots[0] ? (
            <Image
              src={screenshots[0]}
              alt=""
              fill
              sizes="160px"
              className="object-cover"
            />
          ) : (
            <span
              className="text-2xl font-black opacity-30 select-none"
              style={{ color: platformColor }}
            >
              {platformLabel.slice(0, 2).toUpperCase()}
            </span>
          )}

          {/* Status badge overlay */}
          <span
            className={`absolute top-2 left-2 rounded-lg px-2 py-0.5 text-[10px] font-bold leading-none ${style.className}`}
          >
            {style.label}
          </span>

          {/* Promo badge */}
          {promoBadges.length > 0 && (
            <span className="absolute bottom-2 left-2 rounded-lg bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white leading-none">
              {promoBadges[0]}
            </span>
          )}

          {/* Screenshot count */}
          {screenshots.length > 1 && (
            <span className="absolute bottom-2 right-2 rounded-lg bg-black/50 px-1.5 py-0.5 text-[10px] text-white leading-none">
              {screenshots.length}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 min-w-0 flex-col gap-2 p-3 sm:p-4">
          {/* Top row: platform + title + price */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {/* Platform pill */}
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold mb-1"
                style={{ background: `${platformColor}18`, color: platformColor }}
              >
                {platformLabel}
                {listing.ownershipVerified && (
                  <CheckShieldIcon />
                )}
              </span>

              {/* Title */}
              <p className="font-semibold text-foreground text-sm leading-snug line-clamp-2">
                {listing.displayName ? (
                  <>
                    <span className="text-muted font-normal">{listing.displayName} &middot; </span>
                    {listing.title}
                  </>
                ) : (
                  listing.title
                )}
              </p>
            </div>

            {/* Price */}
            <div className="text-right shrink-0">
              <p className="text-base font-bold text-foreground">
                {formatCurrency(listing.price.toString())}
              </p>
              {isAuction && (
                <span className="text-[10px] text-warning font-medium">Auction</span>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1">
              <EyeIcon />
              {formatNumber(listing.viewCount)} views
            </span>
            {listing.followers != null && (
              <span className="flex items-center gap-1">
                <UsersIcon />
                {formatNumber(listing.followers)}
              </span>
            )}
            {listing.monetized && (
              <span className="rounded-full bg-success/10 text-success px-2 py-0.5 font-medium text-[10px]">
                Monetized
              </span>
            )}
            {listing.adsenseStatus && listing.adsenseStatus !== "OFF" && (
              <span className={`rounded-full px-2 py-0.5 font-medium text-[10px] ${ADSENSE_STATUS_STYLE[listing.adsenseStatus].className}`}>
                {ADSENSE_STATUS_STYLE[listing.adsenseStatus].label}
              </span>
            )}
            {(listing.strikeCount > 0 || listing.warningCount > 0) && (
              <span className={`rounded-full px-2 py-0.5 font-medium text-[10px] ${standingPillClass(listing.strikeCount, listing.warningCount)}`}>
                {standingLabel(listing.strikeCount, listing.warningCount)}
              </span>
            )}
            {isAuction && auctionLabel && (
              <span className={`rounded-full px-2 py-0.5 font-medium text-[10px] ${auctionLabel === "Ended" ? "bg-muted/10 text-muted" : "bg-warning/10 text-warning"}`}>
                ⏱ {auctionLabel}
              </span>
            )}
          </div>

          {/* Alert row: rejection + offer badge + bid badge */}
          {(listing.status === "REJECTED" && listing.rejectionReason) && (
            <div className="rounded-xl bg-danger/5 border border-danger/20 px-3 py-2 text-xs text-danger">
              <span className="font-semibold">Rejected: </span>{listing.rejectionReason}
            </div>
          )}

          {/* Notification badges */}
          {(pendingOfferCount > 0 || bidCount > 0) && (
            <div className="flex gap-2">
              {pendingOfferCount > 0 && (
                <Link
                  href="/dashboard/offers"
                  className="flex items-center gap-1 rounded-lg bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning hover:bg-warning/20 transition"
                >
                  {pendingOfferCount} pending offer{pendingOfferCount > 1 ? "s" : ""}
                </Link>
              )}
              {bidCount > 0 && isAuction && (
                <span className="flex items-center gap-1 rounded-lg bg-brand-500/10 px-2.5 py-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                  {bidCount} bid{bidCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-2 mt-auto pt-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {canEdit && (
              <Link href={`/dashboard/listings/${listing.id}/edit`}>
                <Button variant="outline" size="sm">Edit</Button>
              </Link>
            )}

            {listing.status === "ACTIVE" && (
              <Link href={`/listings/${listing.id}`} target="_blank">
                <Button variant="outline" size="sm">View</Button>
              </Link>
            )}

            <Button
              variant="outline"
              size="sm"
              isLoading={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {screenshots.length === 0 ? "Add photo" : "Photos"}
              {screenshots.length > 0 && (
                <span className="ml-1 rounded-full bg-surface-border px-1.5 text-[10px] font-bold">
                  {screenshots.length}
                </span>
              )}
            </Button>

            {canPromote && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPromoteOpen(true)}
                className="border-brand-300 text-brand-600 hover:bg-brand-500/8"
              >
                ⚡ Boost
              </Button>
            )}

            {/* Expand toggle for screenshot preview */}
            {screenshots.length > 0 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="ml-auto text-xs text-muted hover:text-foreground transition"
              >
                {expanded ? "Hide photos ▲" : "Show photos ▼"}
              </button>
            )}

            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                isLoading={deleting}
                onClick={handleDelete}
                className="ml-auto"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded screenshot strip */}
      {expanded && screenshots.length > 0 && (
        <div className="border-t border-surface-border bg-surface-muted px-4 py-3 flex gap-2 overflow-x-auto">
          {screenshots.map((url, i) => (
            <div key={i} className="relative shrink-0 h-20 w-32 rounded-xl overflow-hidden border border-surface-border">
              <Image src={url} alt={`Screenshot ${i + 1}`} fill sizes="128px" className="object-cover" />
            </div>
          ))}
        </div>
      )}

      {promoteOpen && (
        <PromoteModal listingId={listing.id} onClose={() => setPromoteOpen(false)} />
      )}
      {ConfirmDialog}
    </div>
  );
}
