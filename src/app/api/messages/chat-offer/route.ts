import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { conversationId, emitToUser } from "@/lib/socket";
import { OFFER_EXPIRY_HOURS } from "@/lib/constants";

export const dynamic = "force-dynamic";
import { createNotification } from "@/lib/notifications";
import { requiresPhoneVerification, phoneVerificationRequiredResponse } from "@/lib/phone-gate";

/**
 * POST — send a custom price offer card into a DM thread.
 * Direction is inferred from the listing's seller, so this works both ways:
 *   - Seller (owns the listing) pitching a price to the person they're chatting with.
 *   - Buyer (chatting with the seller) making a purchase offer on the seller's listing —
 *     no listings of their own required.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (await requiresPhoneVerification(session.user.id)) {
    return NextResponse.json(phoneVerificationRequiredResponse(), { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const { recipientId, listingId, price, note } = body ?? {};

  if (!recipientId || !listingId || typeof price !== "number" || price <= 0) {
    return NextResponse.json({ error: "recipientId, listingId, and a positive price are required." }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, sellerId: true, status: true, price: true },
  });
  if (!listing || listing.status !== "ACTIVE") {
    return NextResponse.json({ error: "Listing not found or not active." }, { status: 404 });
  }

  const isSellerOffer = listing.sellerId === session.user.id;
  const isBuyerOffer = listing.sellerId === recipientId;
  if (!isSellerOffer && !isBuyerOffer) {
    return NextResponse.json({ error: "This listing doesn't belong to either party in this conversation." }, { status: 403 });
  }

  const buyerId = isSellerOffer ? recipientId : session.user.id;
  const sellerId = isSellerOffer ? session.user.id : recipientId;

  // Check there isn't already a pending chat offer in this conversation for this listing
  const convId = conversationId(session.user.id, recipientId);
  const existingOffer = await prisma.offer.findFirst({
    where: { listingId, buyerId, sellerId, status: "PENDING" },
  });
  if (existingOffer) {
    return NextResponse.json({ error: "There's already a pending offer for this listing in this conversation." }, { status: 409 });
  }

  if (isBuyerOffer) {
    const buyer = await prisma.user.findUnique({ where: { id: session.user.id }, select: { walletBalance: true } });
    const balance = Number(buyer?.walletBalance ?? 0);
    if (balance < price) {
      return NextResponse.json(
        { error: `Insufficient wallet balance. You have $${balance.toFixed(2)} but this offer requires $${price.toFixed(2)}. Deposit funds first.` },
        { status: 400 },
      );
    }
  }

  const expiresAt = isBuyerOffer
    ? new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000)
    : new Date(Date.now() + 48 * 60 * 60 * 1000);

  // Create the Offer record
  const offer = await prisma.offer.create({
    data: {
      listingId,
      buyerId,
      sellerId,
      amount: price,
      message: note ?? null,
      expiresAt,
      status: "PENDING",
    },
  });

  // Create a special message card (content is JSON-encoded for the UI).
  // buyerId lets the UI know which party the "Accept & Buy → checkout" flow
  // applies to, since offers can now be sent by either the seller or the buyer.
  const msgContent = JSON.stringify({
    _type: "chat_offer",
    offerId: offer.id,
    listingId,
    listingTitle: listing.title,
    price,
    note: note ?? null,
    expiresAt: expiresAt.toISOString(),
    buyerId,
  });

  const message = await prisma.message.create({
    data: {
      conversationId: convId,
      senderId: session.user.id,
      recipientId,
      content: msgContent,
      chatOfferId: offer.id,
    },
    include: { sender: { select: { id: true, username: true, name: true, image: true } } },
  });

  emitToUser(recipientId, "new_message", { message });
  await createNotification({
    userId: recipientId,
    type: "OFFER",
    title: `New price offer for "${listing.title}"`,
    body: `$${price.toFixed(2)} — ${note ?? "No note"}`,
    link: `/dashboard/messages/${session.user.id}`,
  });

  return NextResponse.json({ message, offer }, { status: 201 });
}
