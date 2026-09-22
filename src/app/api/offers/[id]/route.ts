import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
import { offerActionSchema } from "@/lib/validation/offer";
import { OFFER_EXPIRY_HOURS } from "@/lib/constants";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { offerAcceptedTemplate } from "@/lib/email-templates";
import { conversationId, emitToUser } from "@/lib/socket";
import { formatCurrency } from "@/lib/utils";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = offerActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { action, amount, message } = parsed.data;

  const offer = await prisma.offer.findUnique({ where: { id: params.id }, include: { listing: true } });
  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

  if (offer.status !== "PENDING") {
    return NextResponse.json({ error: `This offer is already ${offer.status.toLowerCase()}.` }, { status: 400 });
  }
  if (offer.expiresAt < new Date()) {
    await prisma.offer.update({ where: { id: offer.id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "This offer has expired." }, { status: 400 });
  }

  // Offers alternate sides: round 1 is the buyer's opening offer (the seller
  // responds), round 2 a seller counter (the buyer responds), and so on. The
  // party who did NOT make the current round may accept / decline / counter
  // it; the party who made it may withdraw it. Accept/decline used to be
  // hard-wired to the seller, so a buyer could never accept a counter-offer
  // (it just sat PENDING on their "sent" tab until it expired).
  const responderId = offer.round % 2 === 0 ? offer.buyerId : offer.sellerId;
  const initiatorId = responderId === offer.buyerId ? offer.sellerId : offer.buyerId;
  const isResponder = responderId === session.user.id;

  if (action === "cancel") {
    if (initiatorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updated = await prisma.offer.update({ where: { id: offer.id }, data: { status: "CANCELLED" } });
    await createNotification({
      userId: responderId,
      type: "OFFER",
      title: "Offer withdrawn",
      body:
        initiatorId === offer.buyerId
          ? `A buyer withdrew their offer on "${offer.listing.title}".`
          : `The seller withdrew their counter-offer on "${offer.listing.title}".`,
      link: "/dashboard/offers",
    });
    return NextResponse.json({ offer: updated });
  }

  if (!isResponder) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "decline") {
    const updated = await prisma.offer.update({ where: { id: offer.id }, data: { status: "DECLINED" } });
    await createNotification({
      userId: initiatorId,
      type: "OFFER",
      title: initiatorId === offer.buyerId ? "Offer declined" : "Counter-offer declined",
      body:
        initiatorId === offer.buyerId
          ? `Your offer on "${offer.listing.title}" was declined.`
          : `The buyer declined your counter-offer on "${offer.listing.title}".`,
      link: "/dashboard/offers",
    });
    return NextResponse.json({ offer: updated });
  }

  if (action === "counter") {
    if (!amount) return NextResponse.json({ error: "Counter amount is required" }, { status: 400 });

    const [, counterOffer] = await prisma.$transaction([
      prisma.offer.update({ where: { id: offer.id }, data: { status: "COUNTERED" } }),
      prisma.offer.create({
        data: {
          listingId: offer.listingId,
          buyerId: offer.buyerId,
          sellerId: offer.sellerId,
          amount,
          message,
          parentOfferId: offer.id,
          round: offer.round + 1,
          expiresAt: new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000),
        },
      }),
    ]);

    await createNotification({
      userId: initiatorId,
      type: "OFFER",
      title: initiatorId === offer.buyerId ? "Seller countered your offer" : "Buyer countered your offer",
      body: `New counter-offer of ${formatCurrency(amount)} on "${offer.listing.title}"`,
      link: "/dashboard/offers",
    });
    return NextResponse.json({ offer: counterOffer });
  }

  // accept
  if (offer.listing.status !== "ACTIVE") {
    return NextResponse.json({ error: "This listing is no longer active." }, { status: 400 });
  }

  const [updated] = await prisma.$transaction([
    prisma.offer.update({ where: { id: offer.id }, data: { status: "ACCEPTED" } }),
    prisma.offer.updateMany({
      where: { listingId: offer.listingId, status: "PENDING", NOT: { id: offer.id } },
      data: { status: "DECLINED" },
    }),
  ]);

  const [buyer, seller] = await Promise.all([
    prisma.user.findUnique({ where: { id: offer.buyerId } }),
    prisma.user.findUnique({ where: { id: offer.sellerId }, select: { id: true, name: true, username: true } }),
  ]);

  // Who accepted decides who gets told: seller accepting the buyer's offer
  // (classic) vs. buyer accepting the seller's counter-offer.
  const buyerAccepted = session.user.id === offer.buyerId;
  const notifyId = buyerAccepted ? offer.sellerId : offer.buyerId;

  await createNotification({
    userId: notifyId,
    type: "OFFER",
    title: buyerAccepted ? "Your counter-offer was accepted! 🎉" : "Your offer was accepted! 🎉",
    body: buyerAccepted
      ? `The buyer accepted your counter-offer of ${formatCurrency(offer.amount)} on "${offer.listing.title}". They can now start the escrow.`
      : `Your offer of ${formatCurrency(offer.amount)} on "${offer.listing.title}" was accepted. Chat with the seller to get started.`,
    link: buyerAccepted ? "/dashboard/offers" : `/dashboard/messages/${offer.sellerId}`,
  });
  if (buyer && !buyerAccepted) {
    const { subject, html } = offerAcceptedTemplate(
      buyer.name ?? "there",
      offer.listing.title,
      formatCurrency(Number(offer.amount)),
      seller?.name ?? seller?.username ?? "The seller",
    );
    await sendEmail({ to: buyer.email, subject, html }).catch(() => null);
  }

  // Auto-create a chat message so both parties have a conversation thread immediately.
  const convId = conversationId(offer.sellerId, offer.buyerId);
  const sellerName = seller?.username ?? seller?.name ?? "The seller";
  const buyerName = buyer?.username ?? buyer?.name ?? "The buyer";
  const chatMessage = await prisma.message.create({
    data: {
      conversationId: convId,
      senderId: buyerAccepted ? offer.buyerId : offer.sellerId,
      recipientId: notifyId,
      content: buyerAccepted
        ? `Hi! I've accepted your counter-offer of ${formatCurrency(offer.amount)} for "${offer.listing.title}". I'll start the escrow from the Offers page to complete the purchase safely.`
        : `Hi! I've accepted your offer of ${formatCurrency(offer.amount)} for "${offer.listing.title}". Feel free to message me here if you have any questions. When you're ready, click "Start escrow" on the Offers page to complete your purchase safely.`,
      listingId: offer.listingId,
    },
    include: { sender: { select: { id: true, username: true, name: true, image: true } } },
  });

  // Notify the other party of the new message via socket and notification.
  emitToUser(notifyId, "new_message", { message: chatMessage });
  await createNotification({
    userId: notifyId,
    type: "MESSAGE",
    title: `New message from ${buyerAccepted ? buyerName : sellerName}`,
    body: chatMessage.content.slice(0, 80),
    link: `/dashboard/messages/${buyerAccepted ? offer.buyerId : offer.sellerId}`,
  });

  return NextResponse.json({ offer: updated });
}
