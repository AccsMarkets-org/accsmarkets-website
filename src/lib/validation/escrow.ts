import { z } from "zod";

export const createEscrowSchema = z.object({
  listingId: z.string().min(1),
  offerId: z.string().min(1).optional(),
  cryptoNetwork: z.enum(["TRC20", "BEP20", "ERC20", "POLYGON", "SOLANA"]).optional(),
  ownershipEmail: z.string().email().optional(), // YouTube-only: Gmail to receive channel ownership
});

export const submitEscrowSchema = z.object({
  credentials: z.string().trim().min(1).max(4000),
});

export const cancelEscrowSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
