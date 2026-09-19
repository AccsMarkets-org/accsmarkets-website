import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const addSchema = z.object({ listingId: z.string() });

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.watchlist.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        include: { seller: { select: { username: true, name: true, verifiedBadge: true, trustScore: true } } },
      },
    },
  }).catch(() => []);

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "listingId required" }, { status: 400 });

  const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId } });
  if (!listing || listing.status !== "ACTIVE") {
    return NextResponse.json({ error: "Listing not found or not active." }, { status: 404 });
  }

  const item = await prisma.watchlist.upsert({
    where: { userId_listingId: { userId: session.user.id, listingId: parsed.data.listingId } },
    create: { userId: session.user.id, listingId: parsed.data.listingId },
    update: {},
  });

  return NextResponse.json({ item }, { status: 201 });
}
