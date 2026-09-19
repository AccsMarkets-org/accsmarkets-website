import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(3).max(120),
  platform: z.string().optional(),
  criteria: z.record(z.unknown()).optional().default({}),
  budget: z.number().positive().optional(),
});

// GET /api/wanted-listings — list open wanted listings (public)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const page = Math.max(0, Number(searchParams.get("page") ?? 0));
  const PAGE_SIZE = 20;

  const where = {
    status: "OPEN" as const,
    ...(platform ? { platform: platform as never } : {}),
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
