import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 25;

const listingSelect = {
  id: true,
  title: true,
  platform: true,
  status: true,
  isFeatured: true,
  isPremiumFeatured: true,
  isPinned: true,
  featuredUntil: true,
  pinnedUntil: true,
  lastBumpedAt: true,
  updatedAt: true,
  seller: { select: { id: true, name: true, username: true, email: true } },
} as const;

/**
 * GET /api/admin/promotions?tab=active|expired|history&page=0&q=
 *  - active:  listings currently flagged featured / premium / pinned
 *  - expired: listings whose promotion window closed in the last 30 days
 *  - history: PROMOTION / BUMP transactions (paginated) + revenue totals
 */
export async function GET(req: Request) {
  const session = await requireAdmin("MANAGE_LISTINGS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") ?? "active";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0") || 0);
  const now = new Date();

  if (tab === "search") {
    // Listing lookup for the Grant modal: id or title fragment.
    const q = (searchParams.get("q") ?? "").trim();
    if (!q) return NextResponse.json({ listings: [] });
    const listings = await prisma.listing.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ id: q }, { title: { contains: q } }],
      },
      select: listingSelect,
      take: 10,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ listings });
  }

  if (tab === "expired") {
    const since = new Date(now.getTime() - 30 * DAY_MS);
    const listings = await prisma.listing.findMany({
      where: {
        OR: [
          { featuredUntil: { gte: since, lt: now } },
          { pinnedUntil: { gte: since, lt: now } },
        ],
      },
      select: listingSelect,
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ listings });
  }

  if (tab === "history") {
    const where: Prisma.TransactionWhereInput = { type: { in: ["PROMOTION", "BUMP"] }, status: "COMPLETED" };
    const [total, rows, sum7d, sum30d, sumAll] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          type: true,
          amount: true,
          metadata: true,
          createdAt: true,
          user: { select: { id: true, name: true, username: true, email: true } },
        },
      }),
      revenueSince(new Date(now.getTime() - 7 * DAY_MS)),
      revenueSince(new Date(now.getTime() - 30 * DAY_MS)),
      revenueSince(null),
    ]);

    // Promo-code wallet credits are also written as type PROMOTION (no listingId
    // in metadata); label them so they're distinguishable in the table.
    const listingIds = rows
      .map((r) => (r.metadata as { listingId?: string } | null)?.listingId)
      .filter((id): id is string => Boolean(id));
    const listings = listingIds.length
      ? await prisma.listing.findMany({ where: { id: { in: listingIds } }, select: { id: true, title: true } })
      : [];
    const titleById = Object.fromEntries(listings.map((l) => [l.id, l.title]));

    return NextResponse.json({
      rows: rows.map((r) => {
        const meta = (r.metadata ?? {}) as { listingId?: string; promotionType?: string; expiresAt?: string; grantedByAdmin?: boolean };
        return {
          id: r.id,
          type: r.type,
          amount: Number(r.amount),
          promotionType: meta.promotionType ?? (r.type === "BUMP" ? "BUMP" : "PROMO_CREDIT"),
          listingId: meta.listingId ?? null,
          listingTitle: meta.listingId ? titleById[meta.listingId] ?? null : null,
          expiresAt: meta.expiresAt ?? null,
          grantedByAdmin: Boolean(meta.grantedByAdmin),
          user: r.user,
          createdAt: r.createdAt,
        };
      }),
      totals: { revenue7d: sum7d, revenue30d: sum30d, revenueAll: sumAll },
      pagination: { page, pageSize: PAGE_SIZE, hasMore: (page + 1) * PAGE_SIZE < total },
    });
  }

  // Default: active promotions
  const listings = await prisma.listing.findMany({
    where: { OR: [{ isFeatured: true }, { isPremiumFeatured: true }, { isPinned: true }] },
    select: listingSelect,
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
  return NextResponse.json({ listings });
}

/** Revenue from paid promotions/bumps. Promo-code credits (no listingId) are excluded. */
async function revenueSince(since: Date | null): Promise<number> {
  const rows = since
    ? await prisma.$queryRaw<{ total: unknown }[]>`
        SELECT COALESCE(SUM(amount), 0) AS total FROM \`Transaction\`
        WHERE type IN ('PROMOTION', 'BUMP') AND status = 'COMPLETED'
          AND JSON_EXTRACT(metadata, '$.listingId') IS NOT NULL
          AND createdAt >= ${since}`
    : await prisma.$queryRaw<{ total: unknown }[]>`
        SELECT COALESCE(SUM(amount), 0) AS total FROM \`Transaction\`
        WHERE type IN ('PROMOTION', 'BUMP') AND status = 'COMPLETED'
          AND JSON_EXTRACT(metadata, '$.listingId') IS NOT NULL`;
  return Number(rows[0]?.total ?? 0);
}

const grantSchema = z.object({
  listingId: z.string().min(1),
  type: z.enum(["FEATURED_BOOST", "PREMIUM_FEATURED", "PINNED"]),
  days: z.number().int().min(1).max(90),
  reason: z.string().trim().max(300).optional(),
});

/** POST /api/admin/promotions — grant a free promotion (support gesture). */
export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_LISTINGS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = grantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { listingId, type, days, reason } = parsed.data;

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, sellerId: true, status: true, featuredUntil: true, pinnedUntil: true },
  });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  if (listing.status !== "ACTIVE") {
    return NextResponse.json({ error: "Only active listings can be promoted" }, { status: 400 });
  }

  const now = new Date();
  // Extend from the current window if one is still running, else from now.
  const base = type === "PINNED" ? listing.pinnedUntil : listing.featuredUntil;
  const start = base && base > now ? base : now;
  const expiresAt = new Date(start.getTime() + days * DAY_MS);

  await prisma.$transaction(async (tx) => {
    await tx.listing.update({
      where: { id: listing.id },
      data: {
        isFeatured: type === "FEATURED_BOOST" ? true : undefined,
        isPremiumFeatured: type === "PREMIUM_FEATURED" ? true : undefined,
        isPinned: type === "PINNED" ? true : undefined,
        featuredUntil: type !== "PINNED" ? expiresAt : undefined,
        pinnedUntil: type === "PINNED" ? expiresAt : undefined,
      },
    });
    await auditLog(tx, session.user.id, "promotion_grant", "Listing", listing.id, {
      type,
      days,
      expiresAt,
      sellerId: listing.sellerId,
      reason: reason ?? null,
    });
  });

  createNotification({
    userId: listing.sellerId,
    type: "LISTING",
    title: "Your listing received a free promotion",
    body: `"${listing.title}" has been ${labelFor(type)} for ${days} day(s), courtesy of our team.`,
    link: `/listings/${listing.id}`,
  }).catch(() => null);

  return NextResponse.json({ ok: true, expiresAt });
}

function labelFor(type: string) {
  switch (type) {
    case "PREMIUM_FEATURED": return "premium featured";
    case "PINNED": return "pinned";
    default: return "featured";
  }
}
