import type { ReactNode } from "react";
import { Suspense } from "react";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatNumber, formatDate, relativeTime, cn } from "@/lib/utils";
import { LocalPrice } from "@/components/currency/LocalPrice";
import {
  PLATFORM_LABEL,
  PLATFORM_COLOR,
  ADSENSE_STATUS_STYLE,
  getTrustTier,
  standingLabel,
  standingPillClass,
} from "@/lib/constants";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { MakeOfferForm } from "@/components/offers/MakeOfferForm";
import { ReportButton } from "@/components/ui/ReportButton";
import { StarRating } from "@/components/ui/StarRating";
import { AchievementBadgeShelf } from "@/components/ui/AchievementBadge";
import { SimilarListings } from "@/components/listings/SimilarListings";
import { ListingCard } from "@/components/listings/ListingCard";
import { SellerOnlineStatus } from "@/components/ui/SellerOnlineStatus";
import { PhotoGallery } from "@/components/listings/PhotoGallery";
import { ListingRequiredSections } from "@/components/listings/ListingRequiredSections";
import { FollowButton } from "@/components/seller/FollowButton";
import type { Platform } from "@prisma/client";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://accsmarkets.org";

export async function generateMetadata({ params }: { params: { id: string } }) {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: params.id, status: "ACTIVE" },
      select: { title: true, description: true, price: true, platform: true, screenshots: true },
    });
    if (!listing) return {};
    const title = `${listing.title} — AccsMarkets`;
    const description = listing.description?.slice(0, 160) ?? "Buy this account safely via escrow.";
    const images = Array.isArray(listing.screenshots) && listing.screenshots.length > 0
      ? [{ url: listing.screenshots[0] as string }] : [];
    const url = `${BASE_URL}/listings/${params.id}`;
    return {
      title, description,
      alternates: { canonical: url },
      openGraph: { title, description, url, images, type: "website", siteName: "AccsMarkets" },
      twitter: { card: "summary_large_image", title, description, images },
    };
  } catch { return {}; }
}

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let listing: any = null;
  try {
    listing = await prisma.listing.findUnique({
      where: { id: params.id },
      include: {
        seller: {
          select: {
            id: true, username: true, name: true, image: true,
            verifiedBadge: true, trustScore: true, kycLevel: true,
            createdAt: true, lastSeenAt: true, countryCode: true,
            achievementBadges: { select: { badge: true } },
            _count: { select: { followers: true } },
          },
        },
      },
    });
  } catch { notFound(); }

  if (!listing) notFound();

  const isOwnerOrAdmin = session?.user && (session.user.id === listing.sellerId || session.user.role === "ADMIN");
  if (listing.status !== "ACTIVE" && listing.status !== "SOLD" && !isOwnerOrAdmin) notFound();

  const isOwner = session?.user?.id === listing.sellerId;
  const isSold = listing.status === "SOLD";

  // Record a page view for ACTIVE listings viewed by non-owners.
  // Deduped: at most one view per viewer (IP hash) per listing per 6h window,
  // so refreshes / re-renders / prefetches don't inflate the count.
  if (listing.status === "ACTIVE" && !isOwnerOrAdmin) {
    const h = headers();
    const forwarded = h.get("x-forwarded-for");
    const ip = (forwarded ? forwarded.split(",")[0] : "unknown").trim();
    const viewerHash = createHash("sha256").update(ip).digest("hex");
    const viewerId = session?.user?.id ?? null;
    const countryCode = h.get("cf-ipcountry") ?? h.get("x-vercel-ip-country") ?? null;
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const seen = await prisma.listingViewEvent
      .findFirst({ where: { listingId: listing.id, viewerHash, createdAt: { gte: since } }, select: { id: true } })
      .catch(() => null);
    if (!seen) {
      prisma.listing.update({ where: { id: listing.id }, data: { viewCount: { increment: 1 } } }).catch(() => null);
      prisma.listingViewEvent.create({ data: { listingId: listing.id, viewerHash, userId: viewerId, countryCode } }).catch(() => null);
    }
  }
  const canOffer = !!session?.user && !isOwner && !isSold;
  const screenshots = Array.isArray(listing.screenshots) ? (listing.screenshots as string[]) : [];
  const trustTier = getTrustTier(listing.seller.trustScore ?? 0);
  const platformColor = PLATFORM_COLOR[listing.platform as Platform] ?? "#f97316";

  // Premium check: owner/admin always see channel info; paid subscribers also see it
  let isPremiumViewer = !!isOwnerOrAdmin;
  let userWalletBalance = 0;
  if (session?.user?.id && !isOwner) {
    const viewer = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionPlan: { select: { name: true } }, walletBalance: true },
    });
    isPremiumViewer = !!viewer?.subscriptionPlan && viewer.subscriptionPlan.name !== "FREE";
    userWalletBalance = Number(viewer?.walletBalance ?? 0);
  }

  // Seller's AccsMarkets username is always visible.
  // Channel display name and account URL are premium-only.
  function maskChannelName(name: string) {
    if (name.length <= 3) return name[0] + "***";
    return name.slice(0, 2) + "*".repeat(Math.min(name.length - 3, 6)) + name[name.length - 1];
  }
  const sellerUsernameDisplay = listing.seller.username ?? listing.seller.name ?? "Seller";
  const channelDisplayName = listing.displayName ?? listing.seller.username ?? listing.seller.name ?? "Seller";
  const displayChannelName = isPremiumViewer ? channelDisplayName : maskChannelName(channelDisplayName);
  const displayAccountUrl = isPremiumViewer ? listing.accountUrl : null;

  // Check if the current viewer follows this seller
  const isFollowingSeller =
    !!session?.user?.id && !isOwner
      ? !!(await prisma.userFollow
          .findUnique({
            where: {
              followerId_followingId: {
                followerId: session.user.id,
                followingId: listing.sellerId,
              },
            },
            select: { id: true },
          })
          .catch(() => null))
      : false;

  const [sellerStats, sellerReviews, sellerOtherListings, offerHistory, bestOffer, featuredListings] =
    await Promise.all([
      prisma.escrow.aggregate({ where: { sellerId: listing.sellerId, status: "COMPLETED" }, _count: true, _sum: { amount: true } }).catch(() => ({ _count: 0, _sum: { amount: null } })),
      prisma.review.findMany({ where: { revieweeId: listing.sellerId }, orderBy: { createdAt: "desc" }, take: 5, include: { reviewer: { select: { username: true, name: true } } } }).catch(() => []),
      prisma.listing.findMany({ where: { sellerId: listing.sellerId, status: "ACTIVE", id: { not: listing.id } }, orderBy: { createdAt: "desc" }, take: 3, include: { seller: { select: { username: true, name: true, verifiedBadge: true, trustScore: true, countryCode: true } } } }).catch(() => []),
      isOwner ? prisma.offer.findMany({ where: { listingId: listing.id, status: { notIn: ["CANCELLED"] } }, orderBy: { amount: "desc" }, take: 10, include: { buyer: { select: { username: true, name: true } } } }).catch(() => []) : Promise.resolve(null),
      !isOwner ? prisma.offer.findFirst({ where: { listingId: listing.id, status: { notIn: ["CANCELLED","DECLINED","EXPIRED"] } }, orderBy: { amount: "desc" }, select: { amount: true } }).catch(() => null) : Promise.resolve(null),
      prisma.listing.findMany({ where: { status: "ACTIVE", id: { not: listing.id } }, orderBy: [{ isFeatured: "desc" }, { lastBumpedAt: "desc" }], take: 5, include: { seller: { select: { username: true, name: true, verifiedBadge: true, trustScore: true, countryCode: true } } } }).catch(() => []),
    ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dealCount = typeof (sellerStats as any)._count === "number" ? (sellerStats as any)._count : 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dealVolume = (sellerStats as any)._sum?.amount ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reviews = sellerReviews as any[];
  const positiveReviews = reviews.filter((r) => r.rating >= 4).length;
  const negativeReviews = reviews.filter((r) => r.rating < 3).length;
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const strikeCount = listing.strikeCount ?? 0;
  const warningCount = listing.warningCount ?? 0;
  const hasAnalytics = listing.lifetimeViews != null || listing.lifetimeRevenue != null ||
    listing.channelRpm != null || listing.audienceLanguage || listing.adsenseStatus ||
    listing.accountAgeMonths != null || strikeCount > 0 || warningCount > 0;

  const listingUrl = `${BASE_URL}/listings/${listing.id}`;
  const seoSellerName = listing.seller.username ?? listing.seller.name ?? "Seller";
  const seoSellerUrl = listing.seller.username ? `${BASE_URL}/seller/${listing.seller.username}` : BASE_URL;
  const seoPlatformLabel = PLATFORM_LABEL[listing.platform as Platform];
  const seoImages = (Array.isArray(screenshots) ? screenshots : [])
    .filter(Boolean)
    .map((s: string) => (s.startsWith("http") ? s : `${BASE_URL}${s.startsWith("/") ? "" : "/"}${s}`))
    .slice(0, 8);
  const priceValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${listingUrl}#product`,
        name: listing.title,
        description: listing.description ?? undefined,
        image: seoImages.length ? seoImages : [`${BASE_URL}/og-default.png`],
        sku: listing.id,
        category: `${seoPlatformLabel} account`,
        brand: { "@type": "Brand", name: "AccsMarkets" },
        url: listingUrl,
        offers: {
          "@type": "Offer",
          price: Number(listing.price).toFixed(2),
          priceCurrency: "USD",
          availability: listing.status === "ACTIVE" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
          itemCondition: "https://schema.org/UsedCondition",
          url: listingUrl,
          priceValidUntil,
          seller: { "@type": "Person", name: seoSellerName, url: seoSellerUrl },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Listings", item: `${BASE_URL}/listings` },
          { "@type": "ListItem", position: 3, name: `${seoPlatformLabel} accounts`, item: `${BASE_URL}/listings?platform=${listing.platform}` },
          { "@type": "ListItem", position: 4, name: listing.title, item: listingUrl },
        ],
      },
    ],
  };

  const sellerInitial = (listing.seller.username ?? listing.seller.name ?? "?").slice(0, 1).toUpperCase();
  const platformAbbr = (PLATFORM_LABEL[listing.platform as Platform] ?? listing.platform ?? "").slice(0, 2).toUpperCase();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/<\/script>/gi,"<\\/script>").replace(/<!--/g,"<\\!--"),
        }}
      />

      {/* ── Breadcrumb ── */}
      <nav aria-label="Breadcrumb" className="fade-up mb-4 text-xs text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-brand-600">Home</Link></li>
          <li aria-hidden className="text-muted/50">/</li>
          <li><Link href="/listings" className="hover:text-brand-600">Listings</Link></li>
          <li aria-hidden className="text-muted/50">/</li>
          <li><Link href={`/listings?platform=${listing.platform}`} className="hover:text-brand-600">{seoPlatformLabel}</Link></li>
          <li aria-hidden className="text-muted/50">/</li>
          <li className="line-clamp-1 text-foreground/80">{listing.title}</li>
        </ol>
      </nav>

      {/* ── Title bar ── */}
      <div className="fade-up mb-6 flex items-center gap-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white shadow-lg"
          style={{ backgroundColor: platformColor }}
        >
          <PlatformIcon platform={listing.platform} />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-black leading-tight text-foreground sm:text-2xl">{listing.title}</h1>
          <p className="mt-0.5 text-sm text-muted">
            {PLATFORM_LABEL[listing.platform as Platform]} account for sale
            {listing.followers != null && ` with ${formatNumber(listing.followers)} subscribers`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* ──────────── LEFT COLUMN ──────────── */}
        <div className="flex flex-col gap-5">

          {/* Premium Unlock Banner */}
          {!isPremiumViewer && (
            <Link
              href="/pricing"
              className="fade-up flex items-center gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 transition-all hover:shadow-md hover:border-amber-300"
            >
              <svg className="h-5 w-5 shrink-0 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-amber-900 dark:text-amber-300">Unlock channel name & direct link</span>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Upgrade to any paid plan to see the full channel name and account URL</p>
              </div>
              <svg className="ml-auto h-4 w-4 shrink-0 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </Link>
          )}

          {/* Hero card */}
          <div className="fade-up overflow-hidden rounded-2xl border border-surface-border bg-background shadow-sm" style={{ animationDelay: "40ms" }}>
            <div className="p-5 sm:p-6">
              {/* Account listing row — shows account logo + channel name (premium-gated) */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative shrink-0">
                    {listing.accountLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={listing.accountLogo} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-surface-border" />
                    ) : (
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-black text-white"
                        style={{ backgroundColor: platformColor }}
                      >
                        <PlatformIcon platform={listing.platform} className="h-5 w-5 text-white" />
                      </span>
                    )}
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background"
                      style={{ backgroundColor: platformColor }}
                    >
                      <PlatformIcon platform={listing.platform} className="h-2.5 w-2.5 text-white" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    {isPremiumViewer && displayAccountUrl ? (
                      <a href={displayAccountUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:underline transition-colors">
                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        {displayChannelName}
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm font-bold text-muted">
                        <svg className="h-3.5 w-3.5 shrink-0 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        {displayChannelName}
                      </span>
                    )}
                    <span className="text-xs text-muted">Listed {relativeTime(listing.createdAt)}</span>
                  </div>
                </div>
                {listing.ownershipVerified && (
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    Ownership Verified
                  </span>
                )}
                {isSold && (
                  <span className="rounded-full bg-danger px-3 py-1.5 text-[11px] font-black tracking-wider text-white">SOLD</span>
                )}
              </div>

              {/* Stats row */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {listing.followers != null && (
                  <StatTile
                    icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>}
                    label="SUBSCRIBERS"
                    value={formatNumber(listing.followers)}
                    color="#3b82f6"
                  />
                )}
                <StatTile
                  icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"/><path d="M12 18V6"/></svg>}
                  label="PRICE"
                  value={<LocalPrice usd={listing.price.toString()} />}
                  color="#22c55e"
                />
                <StatTile
                  icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                  label="LISTED"
                  value={relativeTime(listing.createdAt)}
                  color="#f59e0b"
                />
                {listing.niche && (
                  <StatTile
                    icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>}
                    label="NICHE"
                    value={listing.niche}
                    color="#7c3aed"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="fade-up" style={{ animationDelay: "60ms" }}>
            <SectionTitle icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}>Description</SectionTitle>
            <div className="rounded-2xl border border-surface-border bg-background p-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {listing.description}
              </p>
            </div>
          </div>

          {/* Feature pills */}
          <div className="fade-up flex flex-wrap gap-2" style={{ animationDelay: "70ms" }}>
            <FeaturePill color="#3b82f6">Escrow Accepted</FeaturePill>
            {listing.monetized && <FeaturePill color="#22c55e">Monetized</FeaturePill>}
            {listing.adsenseStatus && ADSENSE_STATUS_STYLE[listing.adsenseStatus as "ON" | "OFF" | "CHANGEABLE"]?.show && (
              <FeaturePill color="#22c55e">
                Adsense Change: {ADSENSE_STATUS_STYLE[listing.adsenseStatus as "ON" | "OFF" | "CHANGEABLE"].label}
              </FeaturePill>
            )}
            {listing.lifetimeRevenue != null && (
              <FeaturePill color="#f59e0b">Monthly Earnings: {formatCurrency(listing.lifetimeRevenue.toString())}</FeaturePill>
            )}
          </div>

          {/* Analytics — table style */}
          {hasAnalytics && (
            <div className="fade-up" style={{ animationDelay: "80ms" }}>
              <SectionTitle
                icon={
                  <span className="flex h-5 w-5 items-center justify-center rounded-md text-white" style={{ backgroundColor: platformColor }}>
                    <PlatformIcon platform={listing.platform} className="h-3 w-3" />
                  </span>
                }
              >
                {PLATFORM_LABEL[listing.platform as Platform]} Channel Analytics
              </SectionTitle>
              <div className="overflow-hidden rounded-2xl border border-surface-border bg-background">
                <div className="flex flex-col divide-y divide-surface-border">
                  {listing.lifetimeViews != null && (
                    <AnalyticsRow
                      icon={<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                      color="#3b82f6"
                      label="Lifetime Views"
                      value={formatNumber(listing.lifetimeViews)}
                    />
                  )}
                  {listing.lifetimeRevenue != null && (
                    <AnalyticsRow
                      icon={<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                      color="#22c55e"
                      label="Lifetime Revenue"
                      value={`$ ${Number(listing.lifetimeRevenue).toLocaleString()}`}
                    />
                  )}
                  {listing.channelRpm != null && (
                    <AnalyticsRow
                      icon={<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"/><path d="M12 18V6"/></svg>}
                      color="#22c55e"
                      label="Channel RPM"
                      value={`$${Number(listing.channelRpm).toFixed(2)}`}
                    />
                  )}
                  {listing.audienceLanguage && (
                    <AnalyticsRow
                      icon={<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
                      color="#22c55e"
                      label="Audience"
                      value={listing.audienceLanguage}
                    />
                  )}
                  {listing.accountAgeMonths != null && (
                    <AnalyticsRow
                      icon={<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                      color="#3b82f6"
                      label="Channel Creation Date"
                      value={`${listing.accountAgeMonths} months ago`}
                    />
                  )}
                  <AnalyticsRow
                    icon={<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
                    color={strikeCount > 0 || warningCount > 0 ? "#ef4444" : "#22c55e"}
                    label="Strike / Warning"
                    value={standingLabel(strikeCount, warningCount)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Photos — full grid */}
          {screenshots.length > 0 && (
            <div className="fade-up" style={{ animationDelay: "100ms" }}>
              <SectionTitle
                icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
                count={screenshots.length}
              >
                Photos
              </SectionTitle>
              <PhotoGallery screenshots={screenshots} />
            </div>
          )}

          {/* Required sections: Why Buy, Account Details, Transfer Process, Buyer Protection */}
          <div className="fade-up" style={{ animationDelay: "110ms" }}>
            <ListingRequiredSections
              listing={{
                id: listing.id,
                platform: listing.platform,
                price: listing.price.toString(),
                title: listing.title,
                description: listing.description ?? null,
                followersCount: listing.followers ?? null,
                engagementRate: listing.engagementRate ?? null,
                monthlyRevenue: listing.lifetimeRevenue != null ? Number(listing.lifetimeRevenue) : null,
                accountAge: listing.accountAgeMonths != null ? listing.accountAgeMonths * 30 : null,
                transferMethod: listing.transferMethod ?? null,
                monetizationEnabled: listing.monetized ?? null,
                adsenseStatus: listing.adsenseStatus ?? null,
                niche: listing.niche ?? null,
                contentLanguage: listing.audienceLanguage ?? null,
              }}
            />
          </div>

          {/* Seller reviews */}
          {reviews.length > 0 && (
            <div className="fade-up" style={{ animationDelay: "120ms" }}>
              <SectionTitle
                icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>}
                count={reviews.length}
              >
                Seller Reviews
              </SectionTitle>
              <div className="mb-4 flex items-center gap-5 rounded-2xl border border-surface-border bg-background px-5 py-4">
                <div className="text-center">
                  <p className="text-4xl font-black text-foreground">{avgRating.toFixed(1)}</p>
                  <StarRating value={Math.round(avgRating)} size={14} />
                  <p className="mt-0.5 text-xs text-muted">({reviews.length} reviews)</p>
                </div>
                <div className="flex-1">
                  {[5,4,3,2,1].map((star) => {
                    const cnt = reviews.filter((r) => r.rating === star).length;
                    const pct = reviews.length > 0 ? (cnt / reviews.length) * 100 : 0;
                    return (
                      <div key={star} className="mb-1 flex items-center gap-2 text-xs">
                        <span className="w-3 text-right font-medium text-muted">{star}</span>
                        <svg className="h-3 w-3 shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        <div className="flex-1 overflow-hidden rounded-full bg-surface-border h-1.5">
                          <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-5 text-right text-muted">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {reviews.map((review: { id: string; reviewer: { username: string | null; name: string | null }; rating: number; comment?: string; createdAt: Date }) => (
                  <div key={review.id} className="rounded-2xl border border-surface-border bg-background p-4 transition-colors hover:border-brand-200/60">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-xs font-black text-brand-700">
                          {(review.reviewer.username ?? review.reviewer.name ?? "?").slice(0, 1).toUpperCase()}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {review.reviewer.username ?? review.reviewer.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StarRating value={review.rating} size={13} />
                        <span className="text-xs text-muted">{formatDate(review.createdAt)}</span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-sm leading-relaxed text-foreground">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similar accounts */}
          <Suspense>
            <SimilarListings currentId={listing.id} platform={listing.platform} />
          </Suspense>

          {/* Seller's other listings */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(sellerOtherListings as any[]).length > 0 && (
            <div className="fade-up">
              <SectionTitle icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>}>
                More by {sellerUsernameDisplay}
              </SectionTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(sellerOtherListings as any[]).map((l) => (
                  <ListingCard key={l.id} listing={{ ...l, price: l.price.toString() }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ──────────── RIGHT SIDEBAR ──────────── */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">

          {/* ACCOUNT section */}
          <div className="fade-up overflow-hidden rounded-2xl border border-surface-border bg-background shadow-sm">
            <div className="border-b border-surface-border px-5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">Account</p>
            </div>

            {/* Seller Profile */}
            <div className="border-b border-surface-border px-5 py-4">
              <p className="mb-3 text-xs font-bold text-foreground">Seller Profile</p>
              <div className="flex items-center gap-3">
                {listing.seller.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={listing.seller.image} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-surface-border" />
                ) : (
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white shadow-sm"
                    style={{ backgroundColor: platformColor }}
                  >
                    {sellerInitial}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {listing.seller.username ? (
                      <Link href={`/seller/${listing.seller.username}`} className="truncate text-sm font-bold text-foreground hover:text-brand-600 transition-colors">
                        {sellerUsernameDisplay}
                      </Link>
                    ) : (
                      <span className="truncate text-sm font-bold text-foreground">{sellerUsernameDisplay}</span>
                    )}
                    <VerifiedBadge badge={listing.seller.verifiedBadge} size={13} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    {listing.seller.countryCode && <CountryFlag code={listing.seller.countryCode} />}
                    <SellerOnlineStatus
                      sellerId={listing.seller.id}
                      initialLastSeenAt={listing.seller.lastSeenAt?.toISOString?.() ?? listing.seller.lastSeenAt ?? null}
                    />
                  </div>
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs">
                <dt className="text-muted">Member Since</dt>
                <dd className="text-right font-medium text-foreground">{formatDate(listing.seller.createdAt)}</dd>
                <dt className="text-muted">Last Seen</dt>
                <dd className="text-right font-medium text-foreground">{listing.seller.lastSeenAt ? formatDate(listing.seller.lastSeenAt) : "N/A"}</dd>
              </dl>
            </div>

            {/* Seller Trust */}
            <div className="px-5 py-4">
              <p className="mb-3 text-xs font-bold text-foreground">Seller Trust</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="min-w-0 rounded-xl bg-surface px-2 py-2.5">
                  <p className="truncate text-base font-black text-foreground sm:text-lg">{dealCount}</p>
                  <p className="text-[9px] uppercase tracking-wide text-muted">DEALS</p>
                </div>
                <div className="min-w-0 rounded-xl bg-surface px-2 py-2.5">
                  <p className="truncate text-base font-black text-foreground sm:text-lg" title={dealVolume ? formatCurrency(dealVolume.toString()) : "$0"}>{dealVolume ? formatCurrency(dealVolume.toString()) : "$0"}</p>
                  <p className="text-[9px] uppercase tracking-wide text-muted">VOLUME</p>
                </div>
                <div className="min-w-0 rounded-xl bg-surface px-2 py-2.5">
                  <p className="truncate text-base font-black text-foreground sm:text-lg">{reviews.length}</p>
                  <p className="text-[9px] uppercase tracking-wide text-muted">REVIEWS</p>
                </div>
              </div>

              {reviews.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-foreground">{avgRating.toFixed(1)}</span>
                      <StarRating value={Math.round(avgRating)} size={12} />
                      <span className="text-xs text-muted">({reviews.length} reviews)</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[10px]">
                    <span className="flex items-center gap-1 text-success">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                      </svg>
                      {positiveReviews}
                    </span>
                    <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-surface-border">
                      <div className="h-full rounded-full bg-success transition-all duration-700" style={{ width: `${reviews.length > 0 ? Math.round((positiveReviews / reviews.length) * 100) : 0}%` }} />
                    </div>
                    <span className="font-semibold text-success">{reviews.length > 0 ? Math.round((positiveReviews / reviews.length) * 100) : 0}%</span>
                    <span className="flex items-center gap-1 text-muted">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                      </svg>
                      {negativeReviews}
                    </span>
                  </div>
                </div>
              )}

              <p className={cn("mt-3 text-center text-xs font-bold", trustTier.className)}>{trustTier.label} Seller</p>

              {listing.seller.achievementBadges.length > 0 && (
                <div className="mt-3">
                  <AchievementBadgeShelf badges={listing.seller.achievementBadges.map((b: { badge: string }) => b.badge)} />
                </div>
              )}
            </div>

            {/* Actions */}
            {!isOwner && (
              <div className="border-t border-surface-border px-5 py-4 flex flex-col gap-2">
                <a
                  href={session?.user
                    ? `/dashboard/messages/${listing.seller.id}?listingId=${listing.id}`
                    : `/login?callbackUrl=${encodeURIComponent(`/dashboard/messages/${listing.seller.id}?listingId=${listing.id}`)}`
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-info px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-info/90"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Contact Seller
                </a>
                {listing.seller.username && (
                  <div className="flex items-center justify-center">
                    <FollowButton
                      sellerId={listing.seller.id}
                      sellerUsername={listing.seller.username}
                      initialFollowing={isFollowingSeller}
                      initialCount={listing.seller._count.followers}
                    />
                  </div>
                )}
                {session?.user && (
                  <div className="flex justify-center gap-3 text-xs">
                    <ReportButton targetType="LISTING" targetId={listing.id} label="Report listing" />
                    <ReportButton targetType="USER" targetId={listing.sellerId} label="Report seller" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PRICING section */}
          <div className="fade-up overflow-hidden rounded-2xl border border-surface-border bg-background shadow-sm" style={{ animationDelay: "60ms" }}>
            <div className="border-b border-surface-border px-5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">Pricing</p>
            </div>
            <div className="p-5">
              {isSold ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
                    <svg className="h-7 w-7 text-danger" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </div>
                  <LocalPrice usd={listing.price.toString()} className="text-xl font-black text-foreground" />
                  <div className="w-full rounded-xl bg-danger px-4 py-3 text-center text-sm font-black tracking-widest text-white">SOLD OUT</div>
                  <Link href="/listings" className="text-xs text-brand-600 hover:underline">Browse similar →</Link>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-xs font-bold text-foreground">Offers</p>

                  {bestOffer && !isOwner && (
                    <div className="mb-4 flex items-center justify-between rounded-xl border border-success/30 bg-success/5 px-3.5 py-2.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-success">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <circle cx="12" cy="8" r="6"/>
                          <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
                        </svg>
                        Best Offer
                      </div>
                      <span className="text-sm font-black text-success">{formatCurrency(bestOffer.amount.toString())}</span>
                    </div>
                  )}

                  {isOwner && offerHistory && (offerHistory as any[]).length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Offer History</p>
                      <div className="flex flex-col gap-1.5">
                        {(offerHistory as any[]).map((offer, i) => (
                          <div key={offer.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate text-muted">{offer.buyer.username ?? offer.buyer.name ?? "Unknown"}</span>
                            <span className="shrink-0 font-bold text-foreground">{formatCurrency(offer.amount.toString())}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {canOffer && (
                    <div className="flex flex-col gap-2.5">
                      <MakeOfferForm listingId={listing.id} listingPrice={Number(listing.price)} userBalance={userWalletBalance} />
                      <Link
                        href={`/checkout/${listing.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600"
                      >
                        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        Buy now · {formatCurrency(listing.price.toString())}
                      </Link>
                    </div>
                  )}
                  {isOwner && (
                    <div className="flex flex-col gap-2">
                      <Link href={`/dashboard/listings/${listing.id}/edit`} className="block w-full rounded-xl bg-brand-500 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-brand-600">
                        Edit listing
                      </Link>
                      <Link href="/dashboard/listings" className="block w-full rounded-xl border border-surface-border px-4 py-2.5 text-center text-sm font-medium text-foreground transition hover:bg-surface">
                        Manage listings
                      </Link>
                    </div>
                  )}
                  {!session?.user && (
                    <p className="mt-3 text-center text-sm text-muted">
                      <Link href="/login" className="font-semibold text-brand-600 hover:underline">Log in</Link> to make an offer.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* SPONSORED section */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(featuredListings as any[]).length > 0 && (
            <div className="fade-up overflow-hidden rounded-2xl border border-surface-border bg-background shadow-sm" style={{ animationDelay: "80ms" }}>
              <div className="border-b border-surface-border px-5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">Sponsored</p>
              </div>
              <div className="px-5 pt-3 pb-1">
                <p className="text-xs font-bold text-foreground">Featured Listings</p>
              </div>
              <div className="flex flex-col divide-y divide-surface-border">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(featuredListings as any[]).map((fl) => {
                  const flThumb = Array.isArray(fl.screenshots) && fl.screenshots.length > 0
                    ? (fl.screenshots[0] as string) : null;
                  const flColor = PLATFORM_COLOR[fl.platform as Platform] ?? "#f97316";
                  return (
                    <Link key={fl.id} href={`/listings/${fl.id}`} className="group flex items-center gap-3 px-5 py-3 transition hover:bg-surface">
                      {flThumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={flThumb} alt={fl.title} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white"
                          style={{ backgroundColor: flColor }}
                        >
                          {PLATFORM_LABEL[fl.platform as Platform].slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground group-hover:text-brand-600 transition-colors">{fl.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: flColor }}
                          />
                          <span>{formatNumber(fl.followers ?? 0)}</span>
                          <span>·</span>
                          <span>{relativeTime(fl.createdAt)}</span>
                        </div>
                        <p className="text-xs font-bold" style={{ color: flColor }}>
                          <LocalPrice usd={fl.price.toString()} />
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* ─── Sub-components ─── */

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const cls = className ?? "h-4 w-4";
  switch (platform) {
    case "YOUTUBE":
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>;
    case "INSTAGRAM":
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>;
    case "TIKTOK":
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>;
    case "TWITTER_X":
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
    case "FACEBOOK":
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
    case "TELEGRAM":
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.504-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>;
    default:
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
  }
}

function StatTile({ label, value, icon, color }: { label: string; value: ReactNode; icon: ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-background px-3 py-3 transition-colors hover:bg-surface/50">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}15` }}
      >
        <span className="flex h-4 w-4 items-center justify-center" style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
        <p className="text-sm font-black text-foreground leading-tight">{value}</p>
      </div>
    </div>
  );
}

function AnalyticsRow({ icon, color, label, value }: { icon: ReactNode; color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface/30">
      <div className="flex items-center gap-3">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </span>
        <span className="text-sm text-muted">{label}</span>
      </div>
      <span className="text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}

function FeaturePill({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm">
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {children}
    </span>
  );
}

function SectionTitle({ children, icon, count }: { children: ReactNode; icon?: ReactNode; count?: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon && <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted">{icon}</span>}
      <h2 className="text-sm font-bold text-foreground">{children}</h2>
      {count != null && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-brand-100 dark:bg-brand-900/50 px-1.5 text-[10px] font-bold text-brand-700">
          {count}
        </span>
      )}
    </div>
  );
}
