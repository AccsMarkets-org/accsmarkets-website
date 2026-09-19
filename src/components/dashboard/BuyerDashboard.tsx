import Link from "next/link";
import Image from "next/image";
import type { Decimal } from "@prisma/client/runtime/library";
import { Card } from "@/components/ui/Card";
import { formatCurrency, relativeTime } from "@/lib/utils";

// ── Platform metadata ────────────────────────────────────────────────────────

const PLATFORM_LABEL: Record<string, string> = {
  YOUTUBE: "YouTube",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  FACEBOOK: "Facebook",
  TELEGRAM: "Telegram",
  TWITTER_X: "Twitter/X",
  SNAPCHAT: "Snapchat",
  PINTEREST: "Pinterest",
  LINKEDIN: "LinkedIn",
  WEBSITE: "Website",
};

const PLATFORM_COLOR: Record<string, string> = {
  YOUTUBE: "#FF0000",
  INSTAGRAM: "#E1306C",
  TIKTOK: "#010101",
  FACEBOOK: "#1877F2",
  TELEGRAM: "#2AABEE",
  TWITTER_X: "#000000",
  SNAPCHAT: "#FFFC00",
  PINTEREST: "#E60023",
  LINKEDIN: "#0077B5",
  WEBSITE: "#10B981",
};

// ── Status badge helper ──────────────────────────────────────────────────────

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "bg-success/10 text-success",
    COMPLETED: "bg-success/10 text-success",
    PENDING: "bg-warning/10 text-warning",
    FUNDED: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400",
    IN_TRANSFER: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400",
    CANCELLED: "bg-surface-border text-muted",
  };
  return map[status] ?? "bg-surface-border text-muted";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "Active",
    COMPLETED: "Completed",
    PENDING: "Pending",
    FUNDED: "Funded",
    IN_TRANSFER: "In Transfer",
    CANCELLED: "Cancelled",
    SUBMITTED: "Submitted",
    VERIFIED: "Verified",
    DISPUTED: "Disputed",
    AWAITING_MANAGER_ADD: "Awaiting",
    PENDING_VERIFICATION: "Verifying",
  };
  return map[status] ?? status;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface BuyerDashboardProps {
  userId: string;
  user: {
    name: string | null;
    image: string | null;
    walletBalance: Decimal;
    trustScore: number;
    primaryIntent: string | null;
    createdAt: Date;
    kycLevel: string;
  };
  walletValue: number;
  recentPurchases: Array<{
    id: string;
    status: string;
    amount: Decimal;
    createdAt: Date;
    listing: { title: string; platform: string };
    seller: { name: string | null; username: string | null };
  }>;
  savedCount: number;
  offersCount: number;
  activeEscrows: number;
  followingCount: number;
  followingFeed: Array<{
    id: string;
    title: string;
    price: Decimal;
    platform: string;
    createdAt: Date;
    seller: { username: string | null; name: string | null; verifiedBadge: string };
  }>;
  notifications: Array<{
    id: string;
    title: string;
    body: string | null;
    type: string;
    createdAt: Date;
  }>;
}

// ── Notification icon ────────────────────────────────────────────────────────

function NotificationIcon({ type }: { type: string }) {
  const cls = "h-4 w-4";
  if (type === "ESCROW" || type === "ESCROW_UPDATE")
    return (
      <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z" clipRule="evenodd" />
      </svg>
    );
  if (type === "MESSAGE")
    return (
      <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
        <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
      </svg>
    );
  if (type === "OFFER")
    return (
      <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    );
  return (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function BuyerDashboard({
  userId: _userId,
  user,
  walletValue,
  recentPurchases,
  savedCount,
  offersCount,
  activeEscrows,
  followingCount,
  followingFeed,
  notifications,
}: BuyerDashboardProps) {
  const displayName = user.name ?? "Buyer";

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* ── Welcome header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {user.image ? (
            <Image
              src={user.image}
              alt={displayName}
              width={48}
              height={48}
              className="h-12 w-12 rounded-2xl object-cover ring-2 ring-brand-100"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-lg font-black text-brand-600 dark:bg-brand-900/50 dark:text-brand-400">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-foreground">
              Hey, {displayName.split(" ")[0]}
            </h1>
            <p className="text-sm text-muted">
              {user.kycLevel !== "NONE" && (
                <span className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  KYC {user.kycLevel}
                </span>
              )}
              Trust score: {user.trustScore}
            </p>
          </div>
        </div>
        <Link
          href="/listings"
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-500/25 transition hover:bg-brand-600"
        >
          Browse marketplace
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* ── KPI row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Wallet balance */}
        <div className="overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-500/10 to-transparent px-4 py-4 dark:border-brand-800">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400">
            <svg className="h-4.5 w-4.5 h-[18px] w-[18px]" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 5H2v5a2 2 0 002 2h12a2 2 0 002-2V9zm-6 2h2a1 1 0 110 2h-2a1 1 0 110-2z" />
            </svg>
          </div>
          <p className="text-xl font-black tabular-nums text-brand-600">
            {formatCurrency(String(walletValue))}
          </p>
          <p className="mt-0.5 text-xs font-medium text-muted">Wallet balance</p>
        </div>

        {/* Active escrows */}
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface px-4 py-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 dark:text-brand-400">
            <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-xl font-black text-foreground">{activeEscrows}</p>
          <p className="mt-0.5 text-xs font-medium text-muted">Active escrows</p>
        </div>

        {/* Saved listings */}
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface px-4 py-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-400">
            <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
            </svg>
          </div>
          <p className="text-xl font-black text-foreground">{savedCount}</p>
          <p className="mt-0.5 text-xs font-medium text-muted">Saved listings</p>
        </div>

        {/* Offers pending */}
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface px-4 py-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 text-success">
            <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <p className="text-xl font-black text-foreground">{offersCount}</p>
          <p className="mt-0.5 text-xs font-medium text-muted">Offers pending</p>
        </div>
      </div>

      {/* ── Main body: left content + right sidebar ─────────────────────────── */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left / main */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">

          {/* ── Followed sellers feed ──────────────────────────────────────── */}
          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-foreground">Sellers you follow</h2>
                <p className="text-xs text-muted">
                  {followingCount > 0
                    ? `${followingCount} seller${followingCount !== 1 ? "s" : ""} · latest listings`
                    : "Follow sellers to see their new listings here"}
                </p>
              </div>
              {followingCount > 0 && (
                <Link
                  href="/dashboard/watchlist"
                  className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-600 transition"
                >
                  View all
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              )}
            </div>

            {followingFeed.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-surface-border py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-muted">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">No sellers followed yet</p>
                  <p className="mt-1 text-xs text-muted">Follow sellers to get notified when they post new listings.</p>
                </div>
                <Link
                  href="/listings"
                  className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600 transition"
                >
                  Browse marketplace
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {followingFeed.slice(0, 6).map((listing) => {
                  const color = PLATFORM_COLOR[listing.platform] ?? "#888";
                  const label = PLATFORM_LABEL[listing.platform] ?? listing.platform;
                  const sellerDisplay =
                    listing.seller.username
                      ? `@${listing.seller.username}`
                      : (listing.seller.name ?? "Seller");
                  return (
                    <Link key={listing.id} href={`/listings/${listing.id}`} className="group block">
                      <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-background transition hover:border-brand-200 hover:shadow-sm">
                        <div
                          className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
                          style={{ backgroundColor: color }}
                        />
                        <div className="flex items-start gap-3 px-4 py-3.5">
                          <div
                            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-black text-white shadow-sm"
                            style={{ backgroundColor: color }}
                          >
                            {label.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-foreground group-hover:text-brand-600 transition">
                              {listing.title}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              <span className="text-xs text-muted">{sellerDisplay}</span>
                              {listing.seller.verifiedBadge && listing.seller.verifiedBadge !== "NONE" && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                                  <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  {listing.seller.verifiedBadge}
                                </span>
                              )}
                              <span className="text-[10px] text-muted">{relativeTime(listing.createdAt)}</span>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-black tabular-nums text-brand-600">
                              {formatCurrency(listing.price.toString())}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Recent purchases ───────────────────────────────────────────── */}
          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-foreground">Recent purchases</h2>
                <p className="text-xs text-muted">Your latest escrow transactions</p>
              </div>
              <Link
                href="/dashboard/escrows"
                className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-600 transition"
              >
                View all
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            </div>

            {recentPurchases.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-surface-border py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-muted">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">No purchases yet</p>
                  <p className="mt-0.5 text-xs text-muted">Find your first account on the marketplace.</p>
                </div>
                <Link
                  href="/listings"
                  className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand-300 hover:bg-brand-500/8"
                >
                  Browse listings
                </Link>
              </div>
            ) : (
              <Card className="overflow-hidden p-0">
                <div className="divide-y divide-surface-border">
                  {recentPurchases.slice(0, 5).map((purchase, idx) => {
                    const color = PLATFORM_COLOR[purchase.listing.platform] ?? "#888";
                    const label = PLATFORM_LABEL[purchase.listing.platform] ?? purchase.listing.platform;
                    const sellerDisplay =
                      purchase.seller.username
                        ? `@${purchase.seller.username}`
                        : (purchase.seller.name ?? "Seller");
                    return (
                      <Link key={purchase.id} href={`/dashboard/escrows/${purchase.id}`} className="group block">
                        <div className="relative flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-brand-500/8/40">
                          {/* Left accent */}
                          {idx === 0 && (
                            <div
                              className="absolute left-0 top-0 h-full w-0.5 rounded-l"
                              style={{ backgroundColor: color }}
                            />
                          )}
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-black text-white shadow-sm"
                              style={{ backgroundColor: color }}
                            >
                              {label.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-foreground group-hover:text-brand-600 transition">
                                {purchase.listing.title}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
                                <span className="text-xs text-muted">from {sellerDisplay}</span>
                                <span className="text-[10px] text-muted">· {relativeTime(purchase.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-black tabular-nums text-foreground">
                                {formatCurrency(purchase.amount.toString())}
                              </p>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadge(purchase.status)}`}
                              >
                                {statusLabel(purchase.status)}
                              </span>
                            </div>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-border bg-surface text-muted transition group-hover:border-brand-200 group-hover:text-brand-500">
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M9 18l6-6-6-6" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </Card>
            )}
          </section>

          {/* ── Quick actions ─────────────────────────────────────────────── */}
          <section>
            <h2 className="mb-3 text-base font-black text-foreground">Quick actions</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Link
                href="/listings"
                className="group flex flex-col items-center gap-2 rounded-2xl border border-surface-border bg-surface px-4 py-5 text-center transition hover:border-brand-200 hover:bg-brand-500/8/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 transition group-hover:bg-brand-100">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8.707 7.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l2-2a1 1 0 00-1.414-1.414L11 7.586V3a1 1 0 10-2 0v4.586l-.293-.293z" />
                    <path d="M3 5a2 2 0 012-2h1a1 1 0 010 2H5v7h2l1 2h4l1-2h2V5h-1a1 1 0 110-2h1a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-foreground group-hover:text-brand-600 transition">Browse marketplace</span>
              </Link>

              <Link
                href="/dashboard/wallet/deposit"
                className="group flex flex-col items-center gap-2 rounded-2xl border border-surface-border bg-surface px-4 py-5 text-center transition hover:border-brand-200 hover:bg-brand-500/8/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success transition group-hover:bg-success/20">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-foreground group-hover:text-brand-600 transition">Add funds</span>
              </Link>

              <Link
                href="/dashboard/wanted/new"
                className="group flex flex-col items-center gap-2 rounded-2xl border border-surface-border bg-surface px-4 py-5 text-center transition hover:border-brand-200 hover:bg-brand-500/8/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 transition group-hover:bg-amber-100 dark:group-hover:bg-amber-950/60">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-foreground group-hover:text-brand-600 transition">Post wanted</span>
              </Link>

              <Link
                href="/dashboard/watchlist"
                className="group flex flex-col items-center gap-2 rounded-2xl border border-surface-border bg-surface px-4 py-5 text-center transition hover:border-brand-200 hover:bg-brand-500/8/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500 transition group-hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:group-hover:bg-rose-950/60">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-foreground group-hover:text-brand-600 transition">View watchlist</span>
              </Link>
            </div>
          </section>
        </div>

        {/* ── Right sidebar ──────────────────────────────────────────────────── */}
        <aside className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0">

          {/* Quick stats */}
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-black text-foreground">Your stats</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Wallet balance</span>
                <span className="text-xs font-bold text-foreground tabular-nums">
                  {formatCurrency(String(walletValue))}
                </span>
              </div>
              <div className="h-px bg-surface-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Active escrows</span>
                <span className="text-xs font-bold text-foreground">{activeEscrows}</span>
              </div>
              <div className="h-px bg-surface-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Saved listings</span>
                <span className="text-xs font-bold text-foreground">{savedCount}</span>
              </div>
              <div className="h-px bg-surface-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Offers pending</span>
                <span className="text-xs font-bold text-foreground">{offersCount}</span>
              </div>
              <div className="h-px bg-surface-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Sellers followed</span>
                <span className="text-xs font-bold text-foreground">{followingCount}</span>
              </div>
              <div className="h-px bg-surface-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Trust score</span>
                <span className="flex items-center gap-1 text-xs font-bold text-brand-600">
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z" clipRule="evenodd" />
                  </svg>
                  {user.trustScore}
                </span>
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground">Notifications</h3>
              {notifications.length > 0 && (
                <Link
                  href="/dashboard/notifications"
                  className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition"
                >
                  See all
                </Link>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-muted">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-xs text-muted">No new notifications</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {notifications.slice(0, 5).map((notif) => (
                  <Link key={notif.id} href="/dashboard/notifications" className="group block">
                    <div className="flex items-start gap-2.5 rounded-xl p-2 transition hover:bg-brand-500/8/50">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                        <NotificationIcon type={notif.type} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground group-hover:text-brand-600 transition">
                          {notif.title}
                        </p>
                        {notif.body && (
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted">{notif.body}</p>
                        )}
                        <p className="mt-0.5 text-[10px] text-muted">{relativeTime(notif.createdAt)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Wallet CTA */}
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 px-5 py-5 text-white shadow-lg shadow-brand-500/25">
            <p className="text-xs font-semibold text-brand-100">Available balance</p>
            <p className="mt-1 text-2xl font-black tabular-nums">
              {formatCurrency(String(walletValue))}
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/dashboard/wallet/deposit"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/30"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add funds
              </Link>
              <Link
                href="/dashboard/wallet"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/30"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 5H2v5a2 2 0 002 2h12a2 2 0 002-2V9zm-6 2h2a1 1 0 110 2h-2a1 1 0 110-2z" />
                </svg>
                Wallet
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
