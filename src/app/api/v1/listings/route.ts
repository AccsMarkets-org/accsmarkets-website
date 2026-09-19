import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/v1/listings
 * Public API endpoint authenticated via Bearer API key.
 * Supports: platform, status, page, limit query params.
 */
export async function GET(req: NextRequest) {
  const ctx = await authenticateApiKey(req.headers.get("authorization"));
  if (!ctx) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const platform = sp.get("platform") ?? undefined;
  // Only allow public statuses — never expose DRAFT/PENDING/SUSPENDED/REJECTED via API
  const requestedStatus = sp.get("status") ?? "ACTIVE";
  const status = ["ACTIVE", "SOLD"].includes(requestedStatus) ? requestedStatus : "ACTIVE";
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? "20")));
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { status };
  if (platform) where.platform = platform;

  const [total, listings] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      select: {
        id: true,
        title: true,
        platform: true,
        price: true,
        followers: true,
        engagementRate: true,
        monetized: true,
        status: true,
        createdAt: true,
        seller: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    data: listings,
    meta: { total, page, pages: Math.ceil(total / limit), limit },
  });
}
