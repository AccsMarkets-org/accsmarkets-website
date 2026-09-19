import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    select: { id: true, sellerId: true, viewCount: true, createdAt: true, _count: { select: { offers: true } } },
  });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (listing.sellerId !== session.user.id && session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const daysActive = Math.max(1, Math.ceil((Date.now() - listing.createdAt.getTime()) / (1000 * 60 * 60 * 24)));

  return NextResponse.json({
    viewCount: listing.viewCount,
    offerCount: listing._count.offers,
    daysActive,
  });
}
