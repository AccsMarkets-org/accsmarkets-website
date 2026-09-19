import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Optional ?sellerId= to fetch another user's active listings (e.g. so a buyer
  // in a chat thread can pick from the seller's listings to make a purchase offer).
  // Always scoped to ACTIVE listings only — same data already public on /listings.
  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get("sellerId") || session.user.id;

  const listings = await prisma.listing.findMany({
    where: { sellerId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, title: true, price: true, platform: true },
  });

  return NextResponse.json({ listings });
}
