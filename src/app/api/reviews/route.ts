import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { sanitizeText } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  escrowId: z.string(),
  revieweeId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const { escrowId, revieweeId, rating, comment } = parsed.data;

  const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
  if (!escrow || escrow.status !== "COMPLETED") {
    return NextResponse.json({ error: "Can only review completed escrows." }, { status: 400 });
  }

  const isParty = escrow.buyerId === session.user.id || escrow.sellerId === session.user.id;
  if (!isParty) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isRevieweeParty = escrow.buyerId === revieweeId || escrow.sellerId === revieweeId;
  if (!isRevieweeParty || revieweeId === session.user.id) {
    return NextResponse.json({ error: "Invalid reviewee." }, { status: 400 });
  }

  const existing = await prisma.review.findUnique({
    where: { escrowId_reviewerId: { escrowId, reviewerId: session.user.id } },
  });
  if (existing) return NextResponse.json({ error: "You have already reviewed this escrow." }, { status: 409 });

  const review = await prisma.review.create({
    data: {
      escrowId,
      reviewerId: session.user.id,
      revieweeId,
      rating,
      comment: comment ? sanitizeText(comment) : null,
    },
  });

  return NextResponse.json({ review }, { status: 201 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const revieweeId = searchParams.get("revieweeId");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const PAGE_SIZE = 10;

  if (!revieweeId) return NextResponse.json({ error: "revieweeId required" }, { status: 400 });

  try {
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { revieweeId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { reviewer: { select: { id: true, username: true, name: true, image: true } } },
      }),
      prisma.review.count({ where: { revieweeId } }),
    ]);
    const avg = total > 0
      ? await prisma.review.aggregate({ where: { revieweeId }, _avg: { rating: true } })
      : null;
    return NextResponse.json({ reviews, total, page, pageSize: PAGE_SIZE, avgRating: avg?._avg?.rating ?? null });
  } catch {
    return NextResponse.json({ reviews: [], total: 0, page, pageSize: PAGE_SIZE, avgRating: null }, { status: 503 });
  }
}
