import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTrustTier, PLATFORM_COLOR, PLATFORM_LABEL, COUNTRIES } from "@/lib/constants";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { ListingCard } from "@/components/listings/ListingCard";
import { Card } from "@/components/ui/Card";
import { StarRating } from "@/components/ui/StarRating";
import { AchievementBadgeShelf } from "@/components/ui/AchievementBadge";
import { SellerProfileClient } from "./SellerProfileClient";
import { FollowButton } from "@/components/seller/FollowButton";
import { ReportButton } from "@/components/ui/ReportButton";

export const revalidate = 60;

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://accsmarkets.org";

export async function generateMetadata({ params }: { params: { username: string } }) {
  try {
    const seller = await prisma.user.findUnique({
      where: { username: params.username },
      select: { name: true, username: true, bio: true },
    });
    if (!seller) return {};
    const title = `${seller.name ?? seller.username} — AccsMarkets Seller`;
    const description = seller.bio?.slice(0, 160) ?? `View ${seller.username}'s listings on AccsMarkets.`;
    const url = `${BASE_URL}/seller/${seller.username}`;
    return {
      // absolute: `title` already carries the brand; skip the root "%s — AccsMarkets" template.
      title: { absolute: title },
      description,
      alternates: { canonical: url },
      openGraph: { title, description, url, type: "profile", siteName: "AccsMarkets" },
      twitter: { card: "summary", title, description },
    };
  } catch {
    return {};
  }
}

export default async function SellerProfilePage({ params }: { params: { username: string } }) {
  const seller = await prisma.user.findUnique({
    where: { username: params.username },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      bio: true,
      verifiedBadge: true,
      kycLevel: true,
      trustScore: true,
      countryCode: true,
      socialLinks: true,
      lastSeenAt: true,
      createdAt: true,
      listings: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 12,
      },
      reviewsReceived: {
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          reviewer: { select: { name: true, username: true, image: true } },
        },
      },
      achievementBadges: {
        select: { badge: true },
      },
      _count: {
        select: {
          escrowsAsSeller: { where: { status: "COMPLETED" } },
          listings: { where: { status: "ACTIVE" } },
          reviewsReceived: true,
          followers: true,
        },
      },
    },
  });

  if (!seller) notFound();

  // Check if current user follows this seller
  const session = await getServerSession(authOptions);
  let isFollowing = false;
  const isOwnProfile = session?.user?.id === seller.id;

  if (session?.user?.id && !isOwnProfile) {
    const followRecord = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: seller.id,
        },
      },
    });
    isFollowing = !!followRecord;
  }

  const trustTier = getTrustTier(seller.trustScore);

  const avgRating = seller.reviewsReceived.length > 0
    ? seller.reviewsReceived.reduce((s, r) => s + r.rating, 0) / seller.reviewsReceived.length
    : 0;

  const isOnline = seller.lastSeenAt
    ? Date.now() - new Date(seller.lastSeenAt).getTime() < 15 * 60_000
    : false;

  const memberDays = Math.floor((Date.now() - new Date(seller.createdAt).getTime()) / 86400_000);

  const socialLinks = (seller.socialLinks ?? {}) as Record<string, string>;
  const countryName = seller.countryCode
    ? COUNTRIES.find((c) => c.code === seller.countryCode)?.name ?? seller.countryCode
    : null;

  // Platform breakdown from active listings
  const platformMap: Record<string, number> = {};
  for (const l of seller.listings) {
    platformMap[l.platform] = (platformMap[l.platform] || 0) + 1;
  }
  const platforms = Object.entries(platformMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([key, count]) => ({
      key,
      label: PLATFORM_LABEL[key as keyof typeof PLATFORM_LABEL] ?? key,
      color: PLATFORM_COLOR[key as keyof typeof PLATFORM_COLOR] ?? "#888",
      count,
    }));

  const profileUrl = `${BASE_URL}/seller/${seller.username}`;
  const profileJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": profileUrl,
    url: profileUrl,
    dateCreated: new Date(seller.createdAt).toISOString(),
    mainEntity: {
      "@type": "Person",
      "@id": `${profileUrl}#person`,
      name: seller.name ?? seller.username,
      alternateName: seller.username,
      identifier: seller.id,
      url: profileUrl,
      ...(seller.bio ? { description: seller.bio.slice(0, 300) } : {}),
      ...(seller.image ? { image: seller.image } : {}),
      sameAs: Object.values(socialLinks).filter((v) => typeof v === "string" && /^https?:\/\//.test(v)),
      interactionStatistic: {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/FollowAction",
        userInteractionCount: seller._count.followers,
      },
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd).replace(/</g, "\\u003c") }}
      />
      {/* ── Hero banner ───────────────────────────────────────────────────── */}
      <div className="relative -mx-4 sm:-mx-6">
        <div className="h-36 sm:h-48 w-full bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 rounded-b-3xl overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/10 to-transparent" />
        </div>
      </div>

      {/* ── Profile card overlapping banner ────────────────────────────────── */}
      <SellerProfileClient>
        <div className="-mt-16 relative z-10 mx-auto max-w-5xl px-4">
          <Card className="overflow-visible">
            <div className="flex flex-col sm:flex-row items-start gap-5 sm:items-end">
              {/* Avatar */}
              <div className="-mt-12 sm:-mt-14 relative shrink-0">
                {seller.image ? (
                  <Image
                    src={seller.image}
                    alt={seller.username ?? "Seller"}
                    width={96}
                    height={96}
                    className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-lg"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-brand-500 text-3xl font-bold text-white shadow-lg">
                    {(seller.username ?? seller.name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                {isOnline && (
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-success">
                    <span className="h-2 w-2 rounded-full bg-white" />
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">
                    {seller.name ?? seller.username}
                  </h1>
                  <VerifiedBadge badge={seller.verifiedBadge} size={20} />
                  {seller.kycLevel === "ID_VERIFIED" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      ID Verified
                    </span>
                  )}
                  {isOnline && (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                      Online
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span>@{seller.username}</span>
                  <span>·</span>
                  <span className={`font-semibold ${trustTier.className}`}>{trustTier.label}</span>
                  {countryName && seller.countryCode && (
                    <>
                      <span>·</span>
                      <span title={countryName} className="flex items-center gap-1">
                        {seller.countryCode !== "OTHER"
                          ? <CountryFlag code={seller.countryCode} />
                          : "🌍"}{" "}
                        {countryName}
                      </span>
                    </>
                  )}
                  <span>·</span>
                  <span>{memberDays}d on platform</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="shrink-0 pb-1 flex items-center gap-2">
                {!isOwnProfile && session?.user?.id && (
                  <FollowButton
                    sellerId={seller.id}
                    sellerUsername={seller.username ?? ""}
                    initialFollowing={isFollowing}
                    initialCount={seller._count.followers}
                  />
                )}
                <Link
                  href={`/dashboard/messages?to=${seller.username}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition shadow-sm"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                  Contact seller
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <div className="mx-auto mt-6 max-w-5xl px-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Deals completed", value: seller._count.escrowsAsSeller, icon: "🛡️" },
              { label: "Active listings", value: seller._count.listings, icon: "📋" },
              { label: "Average rating", value: avgRating > 0 ? avgRating.toFixed(1) : "—", icon: "⭐" },
              { label: "Trust score", value: `${seller.trustScore}/100`, icon: "💎" },
              { label: "Followers", value: seller._count.followers, icon: "👥" },
            ].map((stat) => (
              <Card key={stat.label} className="flex items-center gap-3 !p-4">
                <span className="text-xl">{stat.icon}</span>
                <div>
                  <p className="text-lg font-bold text-foreground leading-tight">{stat.value}</p>
                  <p className="text-[11px] text-muted">{stat.label}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Main content grid ───────────────────────────────────────────── */}
        <div className="mx-auto mt-6 max-w-5xl px-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* LEFT — main content */}
            <div className="flex flex-col gap-6 lg:col-span-2">

              {/* Bio */}
              {seller.bio && (
                <Card>
                  <h2 className="mb-2 font-semibold text-foreground">About</h2>
                  <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{seller.bio}</p>
                </Card>
              )}

              {/* Achievement badges */}
              {seller.achievementBadges.length > 0 && (
                <Card>
                  <h2 className="mb-3 font-semibold text-foreground">Achievements</h2>
                  <AchievementBadgeShelf badges={seller.achievementBadges.map((b) => b.badge)} />
                </Card>
              )}

              {/* Reviews */}
              {seller.reviewsReceived.length > 0 && (
                <Card>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-foreground">Reviews</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <StarRating value={Math.round(avgRating)} size={16} />
                        <span className="text-sm font-bold text-foreground">{avgRating.toFixed(1)}</span>
                        <span className="text-xs text-muted">({seller._count.reviewsReceived} reviews)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col divide-y divide-surface-border">
                    {seller.reviewsReceived.map((review) => (
                      <div key={review.id} className="py-4 first:pt-0">
                        <div className="flex items-center gap-2.5">
                          {review.reviewer.image ? (
                            <Image
                              src={review.reviewer.image}
                              alt={review.reviewer.name ?? review.reviewer.username ?? ""}
                              width={32}
                              height={32}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-xs font-bold text-brand-600">
                              {(review.reviewer.name ?? review.reviewer.username ?? "?").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {review.reviewer.name ?? review.reviewer.username}
                            </p>
                            <div className="flex items-center gap-2">
                              <StarRating value={review.rating} size={12} />
                              <span className="text-[11px] text-muted">
                                {new Date(review.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </div>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="mt-2 text-sm text-muted leading-relaxed pl-[42px]">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  {seller._count.reviewsReceived > seller.reviewsReceived.length && (
                    <Link
                      href={`/seller/${seller.username}/reviews`}
                      className="mt-4 inline-block text-sm font-semibold text-brand-500 hover:text-brand-600"
                    >
                      View all {seller._count.reviewsReceived} reviews →
                    </Link>
                  )}
                </Card>
              )}

              {/* Active listings grid */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Active listings</h2>
                  {seller._count.listings > 12 && (
                    <span className="text-xs text-muted">Showing 12 of {seller._count.listings}</span>
                  )}
                </div>
                {seller.listings.length === 0 ? (
                  <Card>
                    <p className="py-8 text-center text-sm text-muted">No active listings right now.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {seller.listings.map((listing: any) => (
                      <ListingCard
                        key={listing.id}
                        listing={{
                          ...listing,
                          price: listing.price.toString(),
                          seller: {
                            username: seller.username,
                            name: seller.name,
                            verifiedBadge: seller.verifiedBadge,
                          },
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — sidebar */}
            <div className="flex flex-col gap-6">

              {/* Social links */}
              {Object.keys(socialLinks).length > 0 && (
                <Card>
                  <h2 className="mb-3 font-semibold text-foreground">Social</h2>
                  <div className="flex flex-col gap-2">
                    {socialLinks.twitter && (
                      <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-border/30 hover:text-foreground transition">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        <span>Twitter / X</span>
                      </a>
                    )}
                    {socialLinks.instagram && (
                      <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-border/30 hover:text-foreground transition">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
                        <span>Instagram</span>
                      </a>
                    )}
                    {socialLinks.youtube && (
                      <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-border/30 hover:text-foreground transition">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                        <span>YouTube</span>
                      </a>
                    )}
                    {socialLinks.website && (
                      <a href={socialLinks.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-border/30 hover:text-foreground transition">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                        <span>Website</span>
                      </a>
                    )}
                  </div>
                </Card>
              )}

              {/* Platform breakdown */}
              {platforms.length > 0 && (
                <Card>
                  <h2 className="mb-3 font-semibold text-foreground">Sells on</h2>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((p) => (
                      <span
                        key={p.key}
                        className="inline-flex items-center gap-1.5 rounded-full border border-surface-border px-3 py-1.5 text-xs font-medium text-foreground"
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.label}
                        <span className="text-muted">({p.count})</span>
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* Trust & safety */}
              <Card>
                <h2 className="mb-3 font-semibold text-foreground">Trust &amp; Safety</h2>
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted">Trust score</span>
                      <span className={`font-bold ${trustTier.className}`}>{seller.trustScore}/100</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-border">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          seller.trustScore >= 70 ? "bg-success" : seller.trustScore >= 40 ? "bg-warning" : "bg-danger"
                        }`}
                        style={{ width: `${seller.trustScore}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <svg className="h-3.5 w-3.5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      <span className="text-muted">Escrow protection on all deals</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="h-3.5 w-3.5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      <span className="text-muted">{seller._count.escrowsAsSeller} successful transactions</span>
                    </div>
                    {seller.verifiedBadge !== "NONE" && (
                      <div className="flex items-center gap-2">
                        <svg className="h-3.5 w-3.5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        <span className="text-muted">Identity verified</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <svg className="h-3.5 w-3.5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      <span className="text-muted">Member for {memberDays} days</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Report */}
              <div className="text-center">
                <ReportButton targetType="USER" targetId={seller.id} label="Report this seller" />
              </div>
            </div>
          </div>
        </div>
      </SellerProfileClient>
    </main>
  );
}
