import { prisma } from "@/lib/db";

export interface ListingAnalytics {
  views: number;
  uniqueViews: number;
  watchlistAdds: number;
  offers: number;
  escrows: number;
  sold: boolean;
  daysActive: number;
  conversion: { viewToOffer: number; offerToEscrow: number };
  byDay: { date: string; views: number; unique: number }[];
  byCountry: { country: string; views: number }[];
  /** Kept for the older callers of this endpoint. */
  viewCount: number;
  offerCount: number;
}

/**
 * Per-listing funnel + 30-day view breakdown. Does NOT check ownership —
 * callers (the API route and the analytics page) must do that first.
 */
export async function getListingAnalytics(listingId: string): Promise<ListingAnalytics | null> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      status: true,
      viewCount: true,
      createdAt: true,
      _count: { select: { offers: true, escrows: true, watchlist: true } },
    },
  });
  if (!listing) return null;

  const thirtyDaysAgo = new Date(Date.now() - 29 * 86400_000);
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

  const [uniqueRows, dayRows, countryRows] = await Promise.all([
    prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(DISTINCT viewerHash) AS cnt
      FROM ListingViewEvent
      WHERE listingId = ${listing.id}
    `,
    prisma.$queryRaw<{ day: string | Date; views: bigint; uniq: bigint }[]>`
      SELECT DATE(createdAt) AS day, COUNT(*) AS views, COUNT(DISTINCT viewerHash) AS uniq
      FROM ListingViewEvent
      WHERE listingId = ${listing.id}
        AND createdAt >= ${thirtyDaysAgo}
      GROUP BY DATE(createdAt)
    `,
    prisma.$queryRaw<{ countryCode: string; cnt: bigint }[]>`
      SELECT countryCode, COUNT(*) AS cnt
      FROM ListingViewEvent
      WHERE listingId = ${listing.id}
        AND countryCode IS NOT NULL
      GROUP BY countryCode
      ORDER BY cnt DESC
      LIMIT 10
    `,
  ]);

  // Fill every one of the last 30 days so the chart has a fixed x-axis.
  const dayMap = new Map<string, { views: number; unique: number }>();
  for (const r of dayRows) {
    const key = r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10);
    dayMap.set(key, { views: Number(r.views), unique: Number(r.uniq) });
  }
  const byDay: ListingAnalytics["byDay"] = [];
  for (let i = 0; i < 30; i++) {
    const key = new Date(thirtyDaysAgo.getTime() + i * 86400_000).toISOString().slice(0, 10);
    const row = dayMap.get(key);
    byDay.push({ date: key, views: row?.views ?? 0, unique: row?.unique ?? 0 });
  }

  const views = listing.viewCount;
  const uniqueViews = Number(uniqueRows[0]?.cnt ?? 0);
  const offers = listing._count.offers;
  const escrows = listing._count.escrows;
  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

  return {
    views,
    uniqueViews,
    watchlistAdds: listing._count.watchlist,
    offers,
    escrows,
    sold: listing.status === "SOLD",
    daysActive: Math.max(1, Math.ceil((Date.now() - listing.createdAt.getTime()) / 86400_000)),
    conversion: { viewToOffer: pct(offers, uniqueViews || views), offerToEscrow: pct(escrows, offers) },
    byDay,
    byCountry: countryRows.map((r) => ({ country: r.countryCode, views: Number(r.cnt) })),
    viewCount: views,
    offerCount: offers,
  };
}
