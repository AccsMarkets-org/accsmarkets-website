import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/activity-feed — personalized feed of public activity from followed users + own events
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(0, Number(searchParams.get("page") ?? 0));
  const PAGE_SIZE = 20;

  // Collect user IDs to show: self + users the session user follows
  const following = await prisma.userFollow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });
  const userIds = [session.user.id, ...following.map((f) => f.followingId)];

  const events = await prisma.activityEvent.findMany({
    where: {
      userId: { in: userIds },
      OR: [{ isPublic: true }, { userId: session.user.id }],
    },
    orderBy: { createdAt: "desc" },
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      user: { select: { id: true, username: true, verifiedBadge: true, trustScore: true } },
    },
  });

  return NextResponse.json({ events, page, pageSize: PAGE_SIZE });
}
