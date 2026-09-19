import { cache } from "react";
import { prisma } from "./db";

export const getUserDashboardCounts = cache(async (userId: string) => {
  const [unreadMessages, unreadNotifications, pendingOffers, activeEscrows] = await Promise.all([
    prisma.message.count({ where: { recipientId: userId, isRead: false } }).catch(() => 0),
    prisma.notification.count({ where: { userId, isRead: false } }).catch(() => 0),
    prisma.offer.count({ where: { sellerId: userId, status: "PENDING" } }).catch(() => 0),
    prisma.escrow.count({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        status: { in: ["FUNDED", "SUBMITTED", "VERIFIED", "IN_TRANSFER"] },
      },
    }).catch(() => 0),
  ]);
  return {
    unreadMessages: Number(unreadMessages),
    unreadNotifications: Number(unreadNotifications),
    pendingOffers: Number(pendingOffers),
    activeEscrows: Number(activeEscrows),
  };
});
