import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/users/[id]/follow — follow a user
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (params.id === session.user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.userFollow.upsert({
    where: { followerId_followingId: { followerId: session.user.id, followingId: params.id } },
    update: {},
    create: { followerId: session.user.id, followingId: params.id },
  });

  return NextResponse.json({ following: true });
}

// DELETE /api/users/[id]/follow — unfollow a user
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.userFollow.deleteMany({
    where: { followerId: session.user.id, followingId: params.id },
  });

  return NextResponse.json({ following: false });
}
