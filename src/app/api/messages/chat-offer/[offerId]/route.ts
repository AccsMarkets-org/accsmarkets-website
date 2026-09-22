import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { emitToUser } from "@/lib/socket";
import { createNotification } from "@/lib/notifications";

/**
 * PATCH — the recipient of a chat offer accepts or declines it. Works both
 * directions: a seller pitching one of their listings (buyer accepts), or a
 * buyer proposing a price on the seller's listing (seller accepts).
 */
export async function PATCH(req: Request, { params }: { params: { offerId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const action: "accept" | "decline" = body?.action;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "action must be 'accept' or 'decline'." }, { status: 400 });
  }

  const offer = await prisma.offer.findUnique({
    where: { id: params.offerId },
    include: {
      listing: { select: { title: true } },
      chatOfferMessages: { select: { senderId: true }, take: 1 },
    },
  });
  if (!offer) return NextResponse.json({ error: "Offer not found." }, { status: 404 });

  // Only offers that were sent as a chat card have a sender message. A regular
  // /api/offers offer has none — without this check `senderId` is undefined,
  // the recipient resolves to the buyer, and a buyer could accept their OWN
  // offer here and check out at any price they named.
  const senderId = offer.chatOfferMessages[0]?.senderId;
  if (!senderId) return NextResponse.json({ error: "Offer not found." }, { status: 404 });
  const recipientId = senderId === offer.buyerId ? offer.sellerId : offer.buyerId;
  if (session.user.id !== recipientId) {
    return NextResponse.json({ error: "Only the recipient of this offer can respond to it." }, { status: 403 });
  }
  if (offer.status !== "PENDING") return NextResponse.json({ error: "This offer is no longer pending." }, { status: 409 });
  if (offer.expiresAt < new Date()) {
    await prisma.offer.update({ where: { id: offer.id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "This offer has expired." }, { status: 410 });
  }

  const newStatus = action === "accept" ? "ACCEPTED" : "DECLINED";
  const updatedOffer = await prisma.offer.update({
    where: { id: offer.id },
    data: { status: newStatus },
  });

  // Notify whoever sent the offer.
  const notifyUserId = senderId;
  const amount = Number(offer.amount).toFixed(2);
  await createNotification({
    userId: notifyUserId,
    type: "OFFER",
    title: `Offer ${action === "accept" ? "accepted" : "declined"} for "${offer.listing.title}"`,
    body: action === "accept"
      ? `Your $${amount} offer was accepted.${notifyUserId === offer.buyerId ? " You can now proceed to checkout." : ""}`
      : `Your $${amount} offer was declined.`,
    link: `/dashboard/messages/${session.user.id}`,
  });
  emitToUser(notifyUserId, "offer_update", { offerId: offer.id, status: newStatus });

  return NextResponse.json({ offer: updatedOffer });
}
