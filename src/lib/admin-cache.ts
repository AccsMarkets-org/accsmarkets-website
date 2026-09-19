import { unstable_cache } from "next/cache";
import { prisma } from "./db";

export const getAdminSidebarCounts = unstable_cache(
  async () => {
    const [
      pendingListings,
      pendingDeposits,
      pendingWithdrawals,
      openDisputes,
      pendingKyc,
      pendingBankTransfers,
      unreadContactMessages,
    ] = await Promise.all([
      prisma.listing.count({ where: { status: "PENDING" } }),
      prisma.cryptoWallet.count({ where: { isManual: true, status: "waiting" } }),
      prisma.transaction.count({ where: { type: "WITHDRAWAL", status: "PENDING" } }),
      prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
      prisma.kycSubmission.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
      prisma.bankTransferOrder.count({ where: { status: "SENT" } }),
      prisma.contactMessage.count({ where: { isRead: false } }),
    ]);
    return {
      pendingListings,
      pendingDeposits,
      pendingWithdrawals,
      openDisputes,
      pendingKyc,
      pendingBankTransfers,
      unreadContactMessages,
    };
  },
  ["admin-sidebar-counts"],
  { revalidate: 15 }
);
