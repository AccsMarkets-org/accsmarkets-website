import { prisma } from "@/lib/db";

const ACTIVE_ESCROW = ["FUNDED", "AWAITING_MANAGER_ADD", "PENDING_VERIFICATION", "SUBMITTED", "VERIFIED", "IN_TRANSFER", "DISPUTED"] as const;

/** Full ticket for the admin detail pane: thread incl. internal notes, user card, linked escrow/listing. */
export async function loadAdminTicket(id: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true, username: true, name: true, email: true, image: true,
          kycLevel: true, trustScore: true, isBanned: true, createdAt: true,
        },
      },
      assignee: { select: { id: true, username: true, name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, username: true, image: true } } },
      },
    },
  });
  if (!ticket) return null;

  const [openEscrows, ticketCount, escrow, listing] = await Promise.all([
    prisma.escrow.count({
      where: { OR: [{ buyerId: ticket.userId }, { sellerId: ticket.userId }], status: { in: [...ACTIVE_ESCROW] } },
    }),
    prisma.supportTicket.count({ where: { userId: ticket.userId } }),
    ticket.escrowId
      ? prisma.escrow.findUnique({
          where: { id: ticket.escrowId },
          select: { id: true, status: true, amount: true, buyerId: true, sellerId: true, listing: { select: { title: true } }, dispute: { select: { id: true, status: true } } },
        })
      : null,
    ticket.listingId
      ? prisma.listing.findUnique({ where: { id: ticket.listingId }, select: { id: true, title: true, status: true, platform: true } })
      : null,
  ]);

  return {
    ...ticket,
    userStats: { openEscrows, ticketCount },
    escrow: escrow ? { ...escrow, amount: escrow.amount.toString(), role: escrow.buyerId === ticket.userId ? "buyer" : "seller" } : null,
    listing,
  };
}

export type AdminTicketDetail = NonNullable<Awaited<ReturnType<typeof loadAdminTicket>>>;
