import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLATFORMS } from "@/lib/validation/listing";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(3).max(120),
  // Must be a real Platform enum value — an arbitrary string was cast straight
  // into the Prisma enum column and 500'd.
  platform: z.enum(PLATFORMS).optional(),
  criteria: z.record(z.unknown()).optional().default({}),
  budget: z.number().positive().optional(),
});

// GET /api/wanted-listings — list open wanted listings (public)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platformParam = searchParams.get("platform");
  const platform = platformParam && (PLATFORMS as readonly string[]).includes(platformParam)
    ? (platformParam as (typeof PLATFORMS)[number])
    : null;
  if (platformParam && !platform) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }
  const page = Math.max(0, Math.floor(Number(searchParams.get("page") ?? 0)) || 0);
  const PAGE_SIZE = 20;

  const where = {
    status: "OPEN" as const,
    ...(platform ? { platform } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.wantedListing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        buyer: { select: { id: true, username: true, verifiedBadge: true, trustScore: true } },
      },
    }),
    prisma.wantedListing.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize: PAGE_SIZE });
}

// POST /api/wanted-listings — create a wanted listing
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { title, platform, criteria, budget } = parsed.data;

  const item = await prisma.wantedListing.create({
    data: {
      buyerId: session.user.id,
      title,
      platform: platform as never,
      criteria: (criteria ?? {}) as never,
      budget,
      status: "OPEN",
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
