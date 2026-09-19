import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const bidSchema = z.object({
  amount: z.number().positive(),
});

// GET /api/listings/[id]/bids — list bids for a listing
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    select: { id: true, saleType: true, status: true, auctionEndsAt: true, reservePrice: true },
  });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (listing.saleType !== "AUCTION") {
    return NextResponse.json({ error: "This listing is not an auction" }, { status: 400 });
  }

  const bids = await prisma.auctionBid.findMany({
    where: { listingId: params.id },
    orderBy: { amount: "desc" },
    include: { bidder: { select: { id: true, username: true, verifiedBadge: true, trustScore: true } } },
  });

  return NextResponse.json({ bids });
}

// POST /api/listings/[id]/bids — place a bid
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { amount } = parsed.data;

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    select: {
      id: true, saleType: true, status: true, sellerId: true,
      auctionEndsAt: true, reservePrice: true, minBidIncrement: true,
      buyNowPrice: true,
    },
  });

  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (listing.saleType !== "AUCTION") {
    return NextResponse.json({ error: "This listing is not an auction" }, { status: 400 });
  }
  if (listing.status !== "ACTIVE") {
    return NextResponse.json({ error: "Auction is not active" }, { status: 400 });
  }
  if (listing.sellerId === session.user.id) {
    return NextResponse.json({ error: "You cannot bid on your own listing" }, { status: 400 });
  }
  if (listing.auctionEndsAt && new Date() > listing.auctionEndsAt) {
    return NextResponse.json({ error: "Auction has ended" }, { status: 400 });
  }
  if (!listing.auctionEndsAt) {
    return NextResponse.json({ error: "Auction has no end date set" }, { status: 400 });
  }

  // All validation runs inside a transaction so concurrent bids can't both pass the
  // minimum-increment check against the same top bid.
  let bid: Awaited<ReturnType<typeof prisma.auctionBid.create>>;
  let isBuyNow: boolean;
  try {
    ({ bid, isBuyNow } = await prisma.$transaction(async (tx) => {
      // Re-fetch the top bid inside the transaction to prevent race conditions
      const topBid = await tx.auctionBid.findFirst({
        where: { listingId: params.id },
        orderBy: { amount: "desc" },
        select: { amount: true },
      });

      const minAmount = topBid
        ? Number(topBid.amount) + Number(listing.minBidIncrement ?? 1)
        : Number(listing.reservePrice ?? 0);

      if (amount < minAmount) {
        throw new Error(`MIN_BID:${minAmount.toFixed(2)}`);
      }

      const created = await tx.auctionBid.create({
        data: { listingId: params.id, bidderId: session.user.id, amount },
        include: { bidder: { select: { id: true, username: true, verifiedBadge: true } } },
      });

      const buyNow = Boolean(listing.buyNowPrice && amount >= Number(listing.buyNowPrice));
      if (buyNow) {
        await tx.listing.update({ where: { id: params.id }, data: { status: "PENDING" } });
      }

      return { bid: created, isBuyNow: buyNow };
    }));
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("MIN_BID:")) {
      const min = err.message.slice(8);
      return NextResponse.json({ error: `Minimum bid is $${min}` }, { status: 400 });
    }
    console.error("[bid POST]", err);
    return NextResponse.json({ error: "Failed to place bid. Please try again." }, { status: 500 });
  }

  // Notify both parties when buy-now price is met (listing status already updated in tx)
  if (isBuyNow) {
    await createNotification({
      userId: session.user.id,
      type: "SYSTEM",
      title: "Buy-now price met!",
      body: "You won the auction. Please proceed to checkout to complete your purchase.",
      link: `/checkout/${params.id}`,
    }).catch(() => null);
    await createNotification({
      userId: listing.sellerId,
      type: "SYSTEM",
      title: "Auction won at buy-now price",
      body: "A buyer met your buy-now price. Waiting for them to complete checkout.",
      link: `/dashboard/listings`,
    }).catch(() => null);
  }

  return NextResponse.json({ bid, isBuyNow, checkoutUrl: isBuyNow ? `/checkout/${params.id}` : undefined }, { status: 201 });
}
