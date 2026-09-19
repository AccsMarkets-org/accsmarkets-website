import { z } from "zod";

export const createOfferSchema = z.object({
  listingId: z.string().min(1),
  amount: z.number().min(1),
  message: z.string().trim().max(1000).optional(),
});

export const offerActionSchema = z.object({
  action: z.enum(["accept", "decline", "counter", "cancel"]),
  amount: z.number().min(1).optional(), // required for "counter"
  message: z.string().trim().max(1000).optional(),
});
