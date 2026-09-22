import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { supportTicketReplyTemplate } from "@/lib/email-templates";
import { createNotification, wantsEmail } from "@/lib/notifications";
import { MAX_TICKET_ATTACHMENTS } from "@/components/support/constants";

/** Attachment as stored in SupportTicketMessage.attachments (Json). */
export const attachmentSchema = z.object({
  url: z
    .string()
    .url()
    .max(600)
    .refine((u) => u.startsWith("https://"), "Attachment URL must be https"),
  name: z.string().min(1).max(200),
});

export const attachmentsSchema = z.array(attachmentSchema).max(MAX_TICKET_ATTACHMENTS).optional();

/** Common select for a ticket's public (non-internal) thread, as seen by the owner. */
export const userTicketInclude = {
  messages: {
    where: { isInternal: false },
    orderBy: { createdAt: "asc" as const },
    include: { author: { select: { id: true, name: true, username: true, image: true } } },
  },
} as const;

/**
 * In-app notification + (preference-gated) email to the ticket owner when a
 * staff member posts a public reply. Fire-and-forget safe: never throws.
 */
export async function notifyUserOfStaffReply(ticket: {
  id: string;
  number: number;
  subject: string;
  userId: string;
}, replyBody: string): Promise<void> {
  try {
    await createNotification({
      userId: ticket.userId,
      type: "SYSTEM",
      title: `Support replied to ticket #${ticket.number}`,
      body: replyBody.length > 140 ? `${replyBody.slice(0, 137)}…` : replyBody,
      link: `/dashboard/support/${ticket.id}`,
    });
  } catch {
    // best-effort
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: ticket.userId }, select: { email: true, name: true } });
    if (!user?.email) return;
    if (!(await wantsEmail(ticket.userId, "SYSTEM"))) return;
    const { subject, html } = supportTicketReplyTemplate(user.name ?? "there", ticket.number, ticket.subject, replyBody, ticket.id);
    await sendEmail({ to: user.email, subject, html });
  } catch {
    // best-effort
  }
}
