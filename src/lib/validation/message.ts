import { z } from "zod";

export const sendMessageSchema = z.object({
  recipientId: z.string().min(1),
  content: z.string().trim().max(2000).default(""),
  attachmentUrl: z.string().url().optional(),
  attachmentName: z.string().max(200).optional(),
}).refine((d) => d.content.length > 0 || !!d.attachmentUrl, {
  message: "Message cannot be empty",
});

export const archiveSchema = z.object({
  partnerId: z.string().min(1),
});
