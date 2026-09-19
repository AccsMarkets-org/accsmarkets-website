import Link from "next/link";
import Image from "next/image";
import { formatNumber, cn } from "@/lib/utils";
import { LocalPrice } from "@/components/currency/LocalPrice";
import {
  PLATFORM_LABEL,
  PLATFORM_COLOR,
  ADSENSE_STATUS_STYLE,
  standingLabel,
  standingPillClass,
  getTrustTier,
} from "@/lib/constants";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { WatchlistHeart } from "@/components/listings/WatchlistHeart";
import type { AdsenseStatus, Platform, SaleType, VerifiedBadge as VerifiedBadgeEnum } from "@prisma/client";

export interface ListingCardData {
  id: string;
  title: string;
  platform: Platform;
  price: string | number | { toString(): string };
  followers: number | null;
  monetized: boolean;
  screenshots: unknown;
  accountLogo?: string | null;
  ownershipVerified?: boolean;
  adsenseStatus?: AdsenseStatus | null;
  strikeCount?: number;
  warningCount?: number;
  isFeatured?: boolean;
  isPremiumFeatured?: boolean;
  isPinned?: boolean;
  saleType?: SaleType | null;
  auctionEndsAt?: Date | string | null;
  isPrivate?: boolean;
  niche?: string | null;
  seller: {
    username: string | null;
    name: string | null;
    verifiedBadge: VerifiedBadgeEnum;
    trustScore?: number;
    countryCode?: string | null;
  };
}

const PLATFORM_ICON: Record<string, string> = {
  YOUTUBE: "YT",
  INSTAGRAM: "IG",
  TIKTOK: "TK",
  FACEBOOK: "FB",
  TELEGRAM: "TG",
  TWITTER_X: "𝕏",
  SNAPCHAT: "SC",
  PINTEREST: "PT",
  LINKEDIN: "LI",
  WEBSITE: "WB",
};

/** Skeleton placeholder — same footprint as the real card, for Suspense/loading states. */
export function ListingCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-surface-border bg-background">
      <div className="animate-pulse" style={{ aspectRatio: "16/9" }}>
        <div className="h-full w-full bg-surface" />
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="h-4 w-20 animate-pulse rounded-full bg-surface" />
        <div className="h-4 w-full animate-pulse rounded bg-surface" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
        <div className="mt-auto flex items-center justify-between border-t border-surface-border pt-2.5">
          <div className="h-3 w-16 animate-pulse rounded bg-surface" />
          <div className="h-5 w-14 animate-pulse rounded bg-surface" />
        </div>
      </div>
    </div>
  );
}

export function ListingCard({
  listing,
  showWatchlistHeart,
  watchlisted,
}: {
  listing: ListingCardData;
  showWatchlistHeart?: boolean;
  watchlisted?: boolean;
}) {
  const thumbnail = Array.isArray(listing.screenshots)
    ? (listing.screenshots[0] as string | undefined)
    : undefined;

  const platformColor = PLATFORM_COLOR[listing.platform] ?? "#f97316";

  const strikes = listing.strikeCount ?? 0;
  const warnings = listing.warningCount ?? 0;
  const trustTier = getTrustTier(listing.seller.trustScore ?? 0);

  const topBadge = listing.isPremiumFeatured
    ? { label: "⭐ Premium", cls: "bg-amber-400 text-amber-900" }
    : listing.isFeatured
      ? { label: "Featured", cls: "bg-brand-500 text-white" }
      : listing.isPinned
        ? { label: "📌 Pinned", cls: "bg-surface-border text-foreground" }
        : null;

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="card-animate group relative flex h-full flex-col overflow-hidden rounded-2xl border border-surface-border bg-background transition-all duration-300 ease-out hover:-translate-y-1 hover:border-transparent"
      style={{ "--glow": `${platformColor}40` } as React.CSSProperties}
    >
      {/* Hover glow ring — sits behind the border, tinted per-platform */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 shadow-[0_0_0_1px_var(--glow),0_12px_32px_-8px_var(--glow)] transition-opacity duration-300 group-hover:opacity-100"
      />

      {/* Thumbnail area */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${platformColor}22 0%, ${platformColor}55 100%)` }}
          >
            <span
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-black text-white shadow-xl ring-4 ring-white/20"
              style={{ backgroundColor: platformColor }}
            >
              {PLATFORM_ICON[listing.platform] ?? listing.platform.slice(0, 2)}
            </span>
          </div>
        )}

        {/* Bottom gradient scrim — always present so overlaid chips stay legible on any thumbnail */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        {/* Platform accent bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 opacity-90"
          style={{ backgroundColor: platformColor }}
        />

        {/* Top badge */}
        {topBadge && (
          <span className={cn("absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-sm backdrop-blur-sm", topBadge.cls)}>
            {topBadge.label}
          </span>
        )}

        {/* Watchlist heart */}
        {showWatchlistHeart && (
          <div className="absolute right-2 top-2">
            <WatchlistHeart listingId={listing.id} saved={watchlisted ?? false} />
          </div>
        )}

        {/* Auction countdown pill */}
        {listing.saleType === "AUCTION" && listing.auctionEndsAt && (
          <span className="absolute bottom-3 right-2 rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow">
            🔨 Ends {new Date(listing.auctionEndsAt).toLocaleDateString()}
          </span>
        )}

        {/* Private lock */}
        {listing.isPrivate && (
          <span className="absolute left-2 bottom-2.5 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
            🔒 Private
          </span>
        )}

        {/* Followers — glass chip overlaid on the image so it scans instantly */}
        {listing.followers !== null && !listing.isPrivate && (
          <span className="absolute bottom-2.5 left-2 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
            <svg className="h-3 w-3 shrink-0 opacity-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {formatNumber(listing.followers)}
          </span>
        )}

        {/* Account logo badge */}
        {listing.accountLogo && (
          <img
            src={listing.accountLogo}
            alt={`${listing.title} logo`}
            className="absolute bottom-2 right-2 h-8 w-8 rounded-full object-cover ring-2 ring-white/80 shadow-md"
          />
        )}
      </div>

      {/* Content */}
      <div className="relative flex flex-1 flex-col gap-2.5 p-3.5">
        {/* Platform + attribute pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
            style={{ backgroundColor: platformColor }}
          >
            {PLATFORM_LABEL[listing.platform]}
          </span>
          {listing.niche && (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-400 dark:ring-violet-800">
              {listing.niche}
            </span>
          )}
          {listing.monetized && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-800">
              Monetized
            </span>
          )}
          {listing.ownershipVerified && (
            <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950/30 dark:text-brand-400 dark:ring-brand-800">
              ✓ Verified
            </span>
          )}
          {listing.adsenseStatus && ADSENSE_STATUS_STYLE[listing.adsenseStatus].show && (
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", ADSENSE_STATUS_STYLE[listing.adsenseStatus].className)}>
              {ADSENSE_STATUS_STYLE[listing.adsenseStatus].label}
            </span>
          )}
          {(strikes > 0 || warnings > 0) && (
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", standingPillClass(strikes, warnings))}>
              {standingLabel(strikes, warnings)}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-brand-600">
          {listing.title}
        </h3>

        {/* Seller row */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-surface-border pt-2.5">
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
            {listing.seller.countryCode && (
              <CountryFlag code={listing.seller.countryCode} />
            )}
            <span className="truncate font-medium text-foreground/80">
              {listing.seller.username ?? listing.seller.name}
            </span>
            <VerifiedBadge badge={listing.seller.verifiedBadge} size={12} />
          </div>
          <span className={cn("inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold", trustTier.className)}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {trustTier.label}
          </span>
        </div>

        {/* Price footer */}
        <div className="flex items-center justify-between">
          <LocalPrice usd={listing.price.toString()} className="text-base font-bold text-foreground" />
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-surface-border text-muted transition-all duration-200 group-hover:border-brand-500 group-hover:bg-brand-500 group-hover:text-white"
            aria-hidden
          >
            <svg className="h-3.5 w-3.5 -translate-x-px transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
