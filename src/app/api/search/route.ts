import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listingFilterSchema } from "@/lib/validation/listing";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = listingFilterSchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : { sort: "newest" as const, page: 1 };

  const where: Prisma.ListingWhereInput = {
    status: "ACTIVE",
    ...("platform" in filters && filters.platform ? { platform: filters.platform } : {}),
    ...("monetized" in filters && filters.monetized !== undefined ? { monetized: filters.monetized } : {}),
    ...("verifiedOnly" in filters && filters.verifiedOnly
      ? { seller: { kycLevel: { in: ["PHONE", "ID_VERIFIED"] } } }
      : {}),
    ...(("minPrice" in filters && filters.minPrice !== undefined) ||
    ("maxPrice" in filters && filters.maxPrice !== undefined)
      ? {
          price: {
            ...("minPrice" in filters && filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
            ...("maxPrice" in filters && filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
          },
        }
      : {}),
    ...(("minFollowers" in filters && filters.minFollowers !== undefined) ||
    ("maxFollowers" in filters && filters.maxFollowers !== undefined)
      ? {
          followers: {
            ...("minFollowers" in filters && filters.minFollowers !== undefined ? { gte: filters.minFollowers } : {}),
            ...("maxFollowers" in filters && filters.maxFollowers !== undefined ? { lte: filters.maxFollowers } : {}),
          },
        }
      : {}),
  };

  const q = "q" in filters ? (filters.q ?? "") : "";
  const hasQuery = q.trim().length > 0;

  if (hasQuery) {
    // MySQL FULLTEXT search via raw query, falling back to LIKE if FULLTEXT is unavailable
    try {
      const skip = (filters.page - 1) * PAGE_SIZE;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const listings: any[] = await prisma.$queryRaw`
        SELECT l.id, l.title, l.description, l.platform, l.price, l.followers,
               l.monetized, l.status, l.createdAt, l.sellerId,
               u.username AS sellerUsername, u.name AS sellerName, u.verifiedBadge AS sellerBadge,
               MATCH(l.title, l.description) AGAINST(${q} IN BOOLEAN MODE) AS _score
        FROM Listing l
        JOIN User u ON u.id = l.sellerId
        WHERE l.status = 'ACTIVE'
          AND MATCH(l.title, l.description) AGAINST(${q} IN BOOLEAN MODE)
          ${filters.platform ? Prisma.sql`AND l.platform = ${filters.platform}` : Prisma.empty}
          ${filters.monetized !== undefined ? Prisma.sql`AND l.monetized = ${filters.monetized ? 1 : 0}` : Prisma.empty}
          ${filters.minPrice !== undefined ? Prisma.sql`AND l.price >= ${filters.minPrice}` : Prisma.empty}
          ${filters.maxPrice !== undefined ? Prisma.sql`AND l.price <= ${filters.maxPrice}` : Prisma.empty}
          ${filters.minFollowers !== undefined ? Prisma.sql`AND l.followers >= ${filters.minFollowers}` : Prisma.empty}
          ${filters.maxFollowers !== undefined ? Prisma.sql`AND l.followers <= ${filters.maxFollowers}` : Prisma.empty}
        ORDER BY _score DESC, l.createdAt DESC
        LIMIT ${PAGE_SIZE} OFFSET ${skip}
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countResult: any[] = await prisma.$queryRaw`
        SELECT COUNT(*) AS total FROM Listing l
        WHERE l.status = 'ACTIVE'
          AND MATCH(l.title, l.description) AGAINST(${q} IN BOOLEAN MODE)
          ${filters.platform ? Prisma.sql`AND l.platform = ${filters.platform}` : Prisma.empty}
          ${filters.monetized !== undefined ? Prisma.sql`AND l.monetized = ${filters.monetized ? 1 : 0}` : Prisma.empty}
          ${filters.minPrice !== undefined ? Prisma.sql`AND l.price >= ${filters.minPrice}` : Prisma.empty}
          ${filters.maxPrice !== undefined ? Prisma.sql`AND l.price <= ${filters.maxPrice}` : Prisma.empty}
      `;

      const total = Number(countResult[0]?.total ?? 0);
      const normalised = listings.map((l) => ({
        id: l.id,
        title: l.title,
        platform: l.platform,
        price: l.price.toString(),
        followers: l.followers,
        monetized: l.monetized === 1 || l.monetized === true,
        createdAt: l.createdAt,
        seller: { username: l.sellerUsername, name: l.sellerName, verifiedBadge: l.sellerBadge },
      }));
      return NextResponse.json({ listings: normalised, total, page: filters.page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
    } catch {
      // FULLTEXT index not yet available — fall back to ORM with LIKE
    }
  }

  // Standard ORM query (no full-text or fallback)
  const likeWhere: Prisma.ListingWhereInput = {
    ...where,
    ...(hasQuery
      ? {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ListingOrderByWithRelationInput =
    filters.sort === "price_asc"
      ? { price: "asc" }
      : filters.sort === "price_desc"
        ? { price: "desc" }
        : filters.sort === "followers"
          ? { followers: "desc" }
          : { createdAt: "desc" };

  try {
    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where: likeWhere,
        orderBy,
        skip: (filters.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { seller: { select: { username: true, name: true, verifiedBadge: true } } },
      }),
      prisma.listing.count({ where: likeWhere }),
    ]);
    return NextResponse.json({
      listings: listings.map((l) => ({ ...l, price: l.price.toString() })),
      total,
      page: filters.page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch {
    return NextResponse.json({ listings: [], total: 0, page: filters.page, pages: 1 }, { status: 503 });
  }
}
