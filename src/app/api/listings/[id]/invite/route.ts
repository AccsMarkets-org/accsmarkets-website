import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const inviteSchema = z.object({
  username: z.string().min(1),
});

// GET /api/listings/[id]/invite — seller (or admin) lists who's currently invited
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    select: { sellerId: true },
  });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (listing.sellerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await prisma.privateListingInvite.findMany({
    where: { listingId: params.id },
    orderBy: { createdAt: "desc" },
    include: { invitedUser: { select: { id: true, username: true, name: true, image: true } } },
  });

  return NextResponse.json({ invites });
}

// POST /api/listings/[id]/invite — seller invites a user to a private listing
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    select: { id: true, sellerId: true, isPrivate: true, status: true },
  });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (listing.sellerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!listing.isPrivate) {
    return NextResponse.json({ error: "This listing is not private" }, { status: 400 });
  }

  const invitee = await prisma.user.findUnique({
    where: { username: parsed.data.username },
    select: { id: true, username: true },
  });
  if (!invitee) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (invitee.id === listing.sellerId) {
    return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
  }

  const invite = await prisma.privateListingInvite.upsert({
    where: { listingId_invitedUserId: { listingId: params.id, invitedUserId: invitee.id } },
    update: {},
    create: { listingId: params.id, invitedUserId: invitee.id },
  });

  return NextResponse.json({ invite }, { status: 201 });
}

// DELETE /api/listings/[id]/invite?userId=... — revoke an invite
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    select: { sellerId: true },
  });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (listing.sellerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.privateListingInvite.deleteMany({
    where: { listingId: params.id, invitedUserId: userId },
  });

  return NextResponse.json({ ok: true });
}
