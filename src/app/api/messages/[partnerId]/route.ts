import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { conversationId, emitToUser } from "@/lib/socket";

export const dynamic = "force-dynamic";

/** GET: thread with a partner (cursor pagination via ?before=<messageId>). Marks incoming as read. */
export async function GET(req: Request, { params }: { params: { partnerId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const before = searchParams.get("before");

  const convId = conversationId(userId, params.partnerId);

  const messages = await prisma.message.findMany({
    where: {
      conversationId: convId,
      escrowId: null,
      ...(before && { id: { lt: before } }),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      sender: { select: { id: true, username: true, name: true, image: true } },
      chatOffer: { select: { id: true, status: true, amount: true, expiresAt: true } },
    },
  });

  // Update current user's lastSeenAt (fire-and-forget — don't block the response)
  void prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => null);

  // Mark messages from the partner as read, then tell them via socket.
  const { count } = await prisma.message.updateMany({
    where: { conversationId: convId, recipientId: userId, isRead: false },
    data: { isRead: true },
  });
  if (count > 0) {
    emitToUser(params.partnerId, "messages_read", { conversationId: convId, readerId: userId });
  }

  const [partner, activeEscrow, completedDeals, reviewCount, volumeResult, activeListings, orderHistory] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: params.partnerId },
        select: {
          id: true, username: true, name: true, image: true,
          verifiedBadge: true, lastSeenAt: true, trustScore: true,
        },
      }),
      prisma.escrow.findFirst({
        where: {
          status: { in: ["FUNDED", "AWAITING_MANAGER_ADD", "PENDING_VERIFICATION", "SUBMITTED", "VERIFIED", "IN_TRANSFER", "DISPUTED"] },
          OR: [
            { buyerId: userId, sellerId: params.partnerId },
            { sellerId: userId, buyerId: params.partnerId },
          ],
        },
        select: {
          id: true, status: true, totalCharged: true, transferDeadline: true,
          countdownEndsAt: true, transferModel: true,
          listing: { select: { title: true, platform: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.escrow.count({
        where: {
          status: "COMPLETED",
          OR: [{ buyerId: params.partnerId }, { sellerId: params.partnerId }],
        },
      }),
      prisma.review.count({ where: { revieweeId: params.partnerId } }),
      prisma.escrow.aggregate({
        where: {
          status: "COMPLETED",
          OR: [{ buyerId: params.partnerId }, { sellerId: params.partnerId }],
        },
        _sum: { amount: true },
      }),
      prisma.listing.count({
        where: { sellerId: params.partnerId, status: "ACTIVE" },
      }),
      // Completed orders shared specifically between the two people in this thread — the
      // "old history" that stays visible in the conversation for both buyer and seller once
      // an escrow finishes, even though it drops out of `activeEscrow` above.
      prisma.escrow.findMany({
        where: {
          status: "COMPLETED",
          OR: [
            { buyerId: userId, sellerId: params.partnerId },
            { sellerId: userId, buyerId: params.partnerId },
          ],
        },
        select: {
          id: true, amount: true, completedAt: true, buyerId: true,
          listing: { select: { title: true, platform: true } },
        },
        orderBy: { completedAt: "desc" },
        take: 20,
      }),
    ]);

  const partnerStats = {
    deals: completedDeals,
    volume: Number(volumeResult._sum.amount ?? 0),
    reviews: reviewCount,
    activeListings,
  };

  return NextResponse.json({
    messages: messages.reverse(),
    partner,
    activeEscrow: activeEscrow ?? null,
    partnerStats,
    orderHistory: orderHistory.map((e) => ({
      id: e.id,
      amount: Number(e.amount),
      completedAt: e.completedAt,
      role: e.buyerId === userId ? "buyer" : "seller",
      listing: e.listing,
    })),
  });
}
