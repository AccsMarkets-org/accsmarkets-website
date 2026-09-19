import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { username: string };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = params;

  const seller = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!seller) {
    return NextResponse.json({ error: "Seller not found" }, { status: 404 });
  }

  if (seller.id === session.user.id) {
    return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });
  }

  await prisma.userFollow.upsert({
    where: {
      followerId_followingId: {
        followerId: session.user.id,
        followingId: seller.id,
      },
    },
    create: {
      followerId: session.user.id,
      followingId: seller.id,
    },
    update: {},
  });

  const followerCount = await prisma.userFollow.count({
    where: { followingId: seller.id },
  });

  return NextResponse.json({ following: true, followerCount });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = params;

  const seller = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!seller) {
    return NextResponse.json({ error: "Seller not found" }, { status: 404 });
  }

  if (seller.id === session.user.id) {
    return NextResponse.json({ error: "You cannot unfollow yourself" }, { status: 400 });
  }

  await prisma.userFollow.deleteMany({
    where: {
      followerId: session.user.id,
      followingId: seller.id,
    },
  });

  const followerCount = await prisma.userFollow.count({
    where: { followingId: seller.id },
  });

  return NextResponse.json({ following: false, followerCount });
}
