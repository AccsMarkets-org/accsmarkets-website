import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listingFilterSchema } from "@/lib/validation/listing";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingFilters } from "@/components/listings/ListingFilters";
import { BrowsePageActions } from "@/components/listings/BrowsePageActions";
import { PLATFORM_LABEL, PLATFORM_COLOR } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import type { Prisma, Platform } from "@prisma/client";

export const revalidate = 60;
export const metadata = {
  title: "Browse Listings — AccsMarkets",
  description: "Browse thousands of verified social media accounts for sale. YouTube, Instagram, TikTok, Facebook, Telegram and more — all protected by escrow.",
  openGraph: {
    title: "Browse Listings — AccsMarkets",
    description: "Thousands of verified social media accounts for sale. Every transaction protected by escrow.",
    url: "https://accsmarkets.org/listings",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const, title: "Browse Listings — AccsMarkets" },
  alternates: { canonical: "https://accsmarkets.org/listings" },
};

const PAGE_SIZE = 20;

const PLATFORMS = [
  "YOUTUBE","INSTAGRAM","TIKTOK","FACEBOOK","TELEGRAM","TWITTER_X","SNAPCHAT","PINTEREST","LINKEDIN","WEBSITE",
] as Platform[];

const PLATFORM_SVG: Record<string, React.ReactNode> = {
  YOUTUBE: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  INSTAGRAM: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
  TIKTOK: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>,
  FACEBOOK: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  TELEGRAM: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
  TWITTER_X: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.846L1.254 2.25H8.08l4.252 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  SNAPCHAT: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M12.166.006c1.222-.007 5.22.32 7.11 4.38.605 1.3.46 3.494.345 5.223l-.027.408c.077.042.177.077.303.098.332.058.68.027.918-.065.19-.073.403-.11.625-.11.426 0 .837.135 1.05.34.284.27.321.575.235.807-.143.388-.61.668-1.258.864a6.5 6.5 0 0 1-.315.083l-.187.046c-.186.046-.423.104-.53.265-.062.092-.06.214-.012.4.233.9.98 3.79-.71 5.285-.344.305-.73.524-1.17.68.36.418.827.749 1.394.864.255.052.495.13.68.228.492.262.523.58.49.776-.05.3-.366.553-.77.69-.5.168-1.04.18-1.495.182l-.207.005c-.395.015-.708.092-1.058.402-.48.428-1.087 1.356-2.41 1.917-.655.276-1.405.416-2.204.41-.78-.006-1.512-.148-2.145-.416-1.3-.55-1.913-1.475-2.392-1.904-.35-.31-.662-.386-1.058-.4l-.207-.005c-.45-.002-.99-.013-1.494-.181-.404-.136-.72-.39-.77-.69-.033-.197.003-.514.49-.776.186-.1.424-.176.68-.228.562-.115 1.025-.446 1.39-.864-.44-.156-.827-.375-1.17-.68-1.69-1.496-.943-4.384-.71-5.285.05-.186.05-.308-.013-.4-.107-.16-.344-.22-.53-.264l-.186-.046a6.5 6.5 0 0 1-.315-.083c-.647-.196-1.114-.476-1.258-.864-.086-.232-.049-.537.234-.807.213-.205.625-.34 1.05-.34.223 0 .436.037.626.11.238.092.586.123.918.065.117-.02.212-.052.287-.09l-.023-.412C2.424 4.55 2.272 2.348 2.882 1.046 4.738-.988 8.567-.001 9.85.006h2.316z"/></svg>,
  PINTEREST: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>,
  LINKEDIN: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  WEBSITE: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
};

export default async function BrowseListingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const isAuthenticated = Boolean(session?.user);

  const tab = (searchParams.tab as string | undefined) ?? "listings";
  const parsed = listingFilterSchema.safeParse(searchParams);
  const filters = parsed.success ? parsed.data : { sort: "newest" as const, page: 1 };

  const q = "q" in filters ? (filters.q ?? "") : "";
  const userId = session?.user?.id ?? null;

  const privacyFilter: Prisma.ListingWhereInput = {
    OR: userId
      ? [{ isPrivate: false }, { sellerId: userId }, { privateInvites: { some: { invitedUserId: userId } } }]
      : [{ isPrivate: false }],
  };

  const andClauses: Prisma.ListingWhereInput[] = [privacyFilter];
  if ("platform" in filters && filters.platform) andClauses.push({ platform: filters.platform });
  if ("monetized" in filters && filters.monetized !== undefined) andClauses.push({ monetized: filters.monetized });
  if (("minFollowers" in filters && filters.minFollowers !== undefined) || ("maxFollowers" in filters && filters.maxFollowers !== undefined)) {
    andClauses.push({ followers: {
      ...("minFollowers" in filters && filters.minFollowers !== undefined ? { gte: filters.minFollowers } : {}),
      ...("maxFollowers" in filters && filters.maxFollowers !== undefined ? { lte: filters.maxFollowers } : {}),
    }});
  }
  if (("minPrice" in filters && filters.minPrice !== undefined) || ("maxPrice" in filters && filters.maxPrice !== undefined)) {
    andClauses.push({ price: {
      ...("minPrice" in filters && filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
      ...("maxPrice" in filters && filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
    }});
  }
  if ("verifiedOnly" in filters && filters.verifiedOnly) andClauses.push({ seller: { kycLevel: { in: ["PHONE","ID_VERIFIED"] } } });
  if (q.trim().length > 0) andClauses.push({ OR: [{ title: { contains: q } }, { description: { contains: q } }] });

  const where: Prisma.ListingWhereInput = { status: { in: ["ACTIVE", "SOLD"] }, AND: andClauses };
  const orderBy: Prisma.ListingOrderByWithRelationInput =
    filters.sort === "price_asc" ? { price: "asc" }
    : filters.sort === "price_desc" ? { price: "desc" }
    : filters.sort === "followers" ? { followers: "desc" }
    : { createdAt: "desc" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let listings: any[] = [];
  let total = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wantedItems: any[] = [];
  let wantedTotal = 0;
  let platformCounts: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let soldListings: any[] = [];
  let soldTotal = 0;

  const soldWhere: Prisma.ListingWhereInput = { status: "SOLD", AND: andClauses };

  try {
    if (tab === "wanted") {
      const wantedPlatform = "platform" in filters && filters.platform ? filters.platform : undefined;
      const wantedWhere = { status: "OPEN" as const, ...(wantedPlatform ? { platform: wantedPlatform } : {}) };
      [wantedItems, wantedTotal] = await Promise.all([
        prisma.wantedListing.findMany({
          where: wantedWhere, orderBy: { createdAt: "desc" },
          skip: (filters.page - 1) * PAGE_SIZE, take: PAGE_SIZE,
          include: { buyer: { select: { username: true, verifiedBadge: true, trustScore: true, countryCode: true } } },
        }),
        prisma.wantedListing.count({ where: wantedWhere }),
      ]);
    } else if (tab === "sold") {
      [soldListings, soldTotal] = await Promise.all([
        prisma.listing.findMany({
          where: soldWhere, orderBy: { updatedAt: "desc" },
          skip: (filters.page - 1) * PAGE_SIZE, take: PAGE_SIZE,
          include: { seller: { select: { username: true, name: true, verifiedBadge: true, trustScore: true, countryCode: true } } },
        }),
        prisma.listing.count({ where: soldWhere }),
      ]);
    } else {
      const countsByPlatform = await prisma.listing.groupBy({
        by: ["platform"], where: { status: "ACTIVE", AND: [privacyFilter] }, _count: true,
      }).catch(() => []);
      platformCounts = Object.fromEntries(countsByPlatform.map((r) => [r.platform, r._count]));

      [listings, total] = await Promise.all([
        prisma.listing.findMany({
          where, orderBy, skip: (filters.page - 1) * PAGE_SIZE, take: PAGE_SIZE,
          include: { seller: { select: { username: true, name: true, verifiedBadge: true, trustScore: true, countryCode: true } } },
        }),
        prisma.listing.count({ where }),
      ]);
    }
  } catch {
    /* DB unavailable */
  }

  const activeCount = tab === "wanted" ? wantedTotal : tab === "sold" ? soldTotal : total;
  const totalPages = Math.max(1, Math.ceil(activeCount / PAGE_SIZE));
  const activePlatform = ("platform" in filters ? filters.platform : undefined) as Platform | undefined;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* ── Page header ── */}
      <div className="fade-up mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              {q ? `Results for "${q}"` : "Browse Accounts"}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {activeCount > 0
                ? `${activeCount.toLocaleString()} ${tab === "wanted" ? "requests" : tab === "sold" ? "sold listings" : "active listings"}`
                : "No results found"}
              {activePlatform && ` · ${PLATFORM_LABEL[activePlatform]}`}
            </p>
          </div>
          {isAuthenticated && <BrowsePageActions />}
        </div>
      </div>

      {/* ── Platform chips ── */}
      {tab !== "wanted" && tab !== "sold" && (
        <div className="fade-up mb-5 flex flex-wrap gap-2" style={{ animationDelay: "60ms" }}>
          {[{ key: "", label: "All", count: Object.values(platformCounts).reduce((a, b) => a + b, 0) },
            ...PLATFORMS.map((p) => ({ key: p, label: PLATFORM_LABEL[p], count: platformCounts[p] ?? 0, color: PLATFORM_COLOR[p], icon: PLATFORM_SVG[p] }))
          ].map((item) => {
            const isActive = ("key" in item && item.key === "") ? !activePlatform : ("key" in item && activePlatform === item.key);
            const params = new URLSearchParams();
            Object.entries(searchParams as Record<string, string>).forEach(([k, v]) => {
              if (v !== undefined && k !== "platform" && k !== "page") params.set(k, String(v));
            });
            if ("key" in item && item.key) params.set("platform", item.key);
            return (
              <Link
                key={"key" in item ? item.key : "all"}
                href={`/listings?${params.toString()}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "text-white shadow-md scale-105"
                    : "border border-surface-border bg-background text-muted hover:border-brand-300 hover:text-foreground"
                }`}
                style={isActive && "color" in item && item.color ? { backgroundColor: item.color } : undefined}
              >
                {"icon" in item && item.icon && <span className="text-xs">{item.icon}</span>}
                {item.label}
                {"count" in item && item.count > 0 && (
                  <span className={`text-[11px] ${isActive ? "opacity-80" : "text-muted"}`}>
                    {formatNumber(item.count)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="fade-up mb-5 flex items-center justify-between gap-4" style={{ animationDelay: "80ms" }}>
        <div className="flex gap-1 rounded-xl border border-surface-border bg-surface p-1">
          {[
            { key: "listings", label: "Listings" },
            { key: "sold", label: `Sold${soldTotal > 0 ? ` (${soldTotal.toLocaleString()})` : ""}` },
            { key: "wanted", label: "Wanted" },
          ].map(({ key, label }) => {
            const params = new URLSearchParams();
            Object.entries(searchParams as Record<string, string>).forEach(([k, v]) => {
              if (v !== undefined && k !== "tab" && k !== "page") params.set(k, String(v));
            });
            params.set("tab", key);
            return (
              <Link
                key={key}
                href={`/listings?${params.toString()}`}
                className={tab === key
                  ? "rounded-lg bg-brand-500 px-5 py-1.5 text-sm font-semibold text-white shadow-sm"
                  : "rounded-lg px-5 py-1.5 text-sm text-muted hover:bg-brand-500/8 transition-colors"
                }
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Filters ── */}
      {tab !== "wanted" && tab !== "sold" && (
        <div className="fade-up mb-6" style={{ animationDelay: "100ms" }}>
          <Suspense>
            <ListingFilters isAuthenticated={isAuthenticated} />
          </Suspense>
        </div>
      )}

      {/* ── Listings grid ── */}
      {tab === "sold" ? (
        soldListings.length === 0 ? (
          <EmptyState
            icon="🏷️"
            title="No sold listings yet"
            subtitle="Completed sales will appear here"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {soldListings.map((listing) => (
              <div key={listing.id} className="relative grayscale opacity-70">
                <ListingCard
                  listing={{ ...listing, price: listing.price.toString() }}
                />
                <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-3">
                  <span className="rounded-lg bg-danger px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                    SOLD
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === "wanted" ? (
        wantedItems.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No wanted requests yet"
            subtitle="Be the first to post what you're looking for"
            action={isAuthenticated ? { href: "/dashboard/wanted/new", label: "Post a wanted request" } : undefined}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {wantedItems.map((item: {
              id: string; title: string; platform: string | null;
              budget: { toString(): string } | null; criteria: Record<string, unknown>;
              createdAt: Date; buyer: { username: string | null; verifiedBadge: string; trustScore: number; countryCode: string | null };
            }) => (
              <Link
                key={item.id}
                href={`/wanted/${item.id}`}
                className="card-animate flex items-start justify-between gap-4 rounded-2xl border border-surface-border bg-background p-4 transition-all hover:border-brand-300/70 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {item.platform && (
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                        style={{ backgroundColor: PLATFORM_COLOR[item.platform as Platform] ?? "#f97316" }}>
                        {PLATFORM_LABEL[item.platform as keyof typeof PLATFORM_LABEL] ?? item.platform}
                      </span>
                    )}
                    <span className="text-xs text-muted">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="font-semibold text-foreground line-clamp-2">{item.title}</p>
                  {item.criteria && typeof item.criteria === "object" && Object.keys(item.criteria).length > 0 && (
                    <p className="mt-1 text-xs text-muted line-clamp-1">
                      {Object.entries(item.criteria as Record<string, unknown>)
                        .filter(([, v]) => v !== null && v !== undefined && v !== "")
                        .slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {item.budget && <p className="font-bold text-foreground text-lg">${Number(item.budget).toLocaleString()}</p>}
                  <p className="text-xs text-muted">{item.buyer.username}</p>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : listings.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No listings match your filters"
          subtitle="Try adjusting your search or clear all filters"
          action={{ href: "/listings", label: "Clear filters" }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={{ ...listing, price: listing.price.toString() }}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="mt-12 flex justify-center gap-2">
          {filters.page > 1 && (
            <PaginationLink searchParams={searchParams} page={filters.page - 1} label="←" />
          )}
          {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => {
            const p = totalPages <= 9 ? i + 1 : filters.page <= 5
              ? i + 1
              : filters.page >= totalPages - 4 ? totalPages - 8 + i
              : filters.page - 4 + i;
            return (
              <PaginationLink
                key={p} searchParams={searchParams} page={p}
                label={String(p)} active={p === filters.page}
              />
            );
          })}
          {filters.page < totalPages && (
            <PaginationLink searchParams={searchParams} page={filters.page + 1} label="→" />
          )}
        </div>
      )}
    </main>
  );
}

function EmptyState({ icon, title, subtitle, action }: {
  icon: string; title: string; subtitle: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="mb-4 text-5xl">{icon}</span>
      <p className="text-lg font-bold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
      {action && (
        <Link href={action.href} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
          {action.label}
        </Link>
      )}
    </div>
  );
}

function PaginationLink({ searchParams, page, label, active }: {
  searchParams: Record<string, string | string[] | undefined>;
  page: number; label: string; active?: boolean;
}) {
  const params = new URLSearchParams();
  Object.entries(searchParams as Record<string, string>).forEach(([k, v]) => {
    if (v !== undefined && k !== "page") params.set(k, String(v));
  });
  params.set("page", String(page));
  return (
    <a
      href={`/listings?${params.toString()}`}
      className={active
        ? "flex h-9 min-w-9 items-center justify-center rounded-xl bg-brand-500 px-2.5 text-sm font-bold text-white shadow-sm"
        : "flex h-9 min-w-9 items-center justify-center rounded-xl border border-surface-border bg-background px-2.5 text-sm text-muted transition hover:border-brand-300 hover:text-foreground"
      }
    >
      {label}
    </a>
  );
}
