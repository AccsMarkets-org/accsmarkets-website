import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(0, Number(searchParams.get("page") ?? "0"));

  const followRows = await prisma.userFollow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });

  if (followRows.length === 0) {
    return NextResponse.json({ listings: [], hasMore: false });
  }

  const followingIds = followRows.map((r) => r.followingId);

  const listings = await prisma.listing.findMany({
    where: { sellerId: { in: followingIds }, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      title: true,
      platform: true,
      price: true,
      followers: true,
      monetized: true,
      screenshots: true,
      accountLogo: true,
      isFeatured: true,
      isPremiumFeatured: true,
      isPinned: true,
      createdAt: true,
      seller: {
        select: {
          username: true,
          name: true,
          image: true,
          verifiedBadge: true,
        },
      },
    },
  });

  const hasMore = listings.length > PAGE_SIZE;
  return NextResponse.json({
    listings: listings.slice(0, PAGE_SIZE).map((l) => ({
      ...l,
      price: Number(l.price),
    })),
    hasMore,
  });
}
