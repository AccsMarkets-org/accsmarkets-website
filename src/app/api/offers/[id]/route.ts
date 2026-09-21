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

  if (action === "cancel") {
    if (offer.buyerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updated = await prisma.offer.update({ where: { id: offer.id }, data: { status: "CANCELLED" } });
    await createNotification({
      userId: offer.sellerId,
      type: "OFFER",
      title: "Offer withdrawn",
      body: `A buyer withdrew their offer on "${offer.listing.title}".`,
      link: "/dashboard/offers",
    });
    return NextResponse.json({ offer: updated });
  }

  // accept / decline / counter are seller-only actions
  if (offer.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "decline") {
    const updated = await prisma.offer.update({ where: { id: offer.id }, data: { status: "DECLINED" } });
    await createNotification({
      userId: offer.buyerId,
      type: "OFFER",
      title: "Offer declined",
      body: `Your offer on "${offer.listing.title}" was declined.`,
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
      userId: offer.buyerId,
      type: "OFFER",
      title: "Seller countered your offer",
      body: `New counter-offer on "${offer.listing.title}"`,
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

  await createNotification({
    userId: offer.buyerId,
    type: "OFFER",
    title: "Your offer was accepted! 🎉",
    body: `Your offer of ${formatCurrency(offer.amount)} on "${offer.listing.title}" was accepted. Chat with the seller to get started.`,
    link: `/dashboard/messages/${offer.sellerId}`,
  });
  if (buyer) {
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
  const chatMessage = await prisma.message.create({
    data: {
      conversationId: convId,
      senderId: offer.sellerId,
      recipientId: offer.buyerId,
      content: `Hi! I've accepted your offer of ${formatCurrency(offer.amount)} for "${offer.listing.title}". Feel free to message me here if you have any questions. When you're ready, click "Start escrow" on the Offers page to complete your purchase safely.`,
      listingId: offer.listingId,
    },
    include: { sender: { select: { id: true, username: true, name: true, image: true } } },
  });

  // Notify buyer of the new message via socket and notification.
  emitToUser(offer.buyerId, "new_message", { message: chatMessage });
  await createNotification({
    userId: offer.buyerId,
    type: "MESSAGE",
    title: `New message from ${sellerName}`,
    body: chatMessage.content.slice(0, 80),
    link: `/dashboard/messages/${offer.sellerId}`,
  });

  return NextResponse.json({ offer: updated });
}
