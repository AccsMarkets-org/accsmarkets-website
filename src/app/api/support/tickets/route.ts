import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import { sendEmail } from "@/lib/email";
import { supportTicketCreatedTemplate, adminNotifyTemplate } from "@/lib/email-templates";
import { emitToAdmins } from "@/lib/socket";
import { appUrl } from "@/lib/email-render";
import { CLOSED_TICKET_STATUSES, OPEN_TICKET_STATUSES } from "@/components/support/constants";
import { attachmentsSchema } from "../_shared";
import type { Prisma, SupportTicketCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

const CATEGORIES: [SupportTicketCategory, ...SupportTicketCategory[]] = ["ACCOUNT", "PAYMENT", "ESCROW", "LISTING", "KYC", "TECHNICAL", "OTHER"];

const createSchema = z.object({
  subject: z.string().trim().min(5, "Subject must be at least 5 characters").max(150),
  category: z.enum(CATEGORIES),
  message: z.string().trim().min(20, "Please describe the issue in at least 20 characters").max(5000),
  attachments: attachmentsSchema,
  escrowId: z.string().trim().min(1).max(64).optional().nullable(),
  listingId: z.string().trim().min(1).max(64).optional().nullable(),
});

/** GET /api/support/tickets?filter=open|resolved — the caller's own tickets. */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter");
  const statusWhere: Prisma.SupportTicketWhereInput =
    filter === "open" ? { status: { in: OPEN_TICKET_STATUSES } }
    : filter === "resolved" ? { status: { in: CLOSED_TICKET_STATUSES } }
    : {};

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.user.id, ...statusWhere },
    orderBy: { lastReplyAt: "desc" },
    take: 100,
    select: {
      id: true, number: true, subject: true, category: true, status: true, priority: true,
      escrowId: true, listingId: true, lastReplyAt: true, resolvedAt: true, createdAt: true,
      messages: {
        where: { isInternal: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { isStaff: true, createdAt: true, body: true },
      },
    },
  });

  return NextResponse.json({
    tickets: tickets.map(({ messages, ...t }) => ({
      ...t,
      lastMessage: messages[0] ?? null,
      hasUnreadStaffReply: messages[0]?.isStaff === true,
    })),
  });
}

/** POST /api/support/tickets — open a new ticket. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { allowed } = await checkRateLimit(`support-create:${userId}`, 5, 3600);
  if (!allowed) return NextResponse.json({ error: "Too many tickets opened recently. Please wait an hour." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const data = parsed.data;
  const subject = sanitizeText(data.subject);
  const message = sanitizeText(data.message);
  if (subject.length < 5 || message.length < 20) {
    return NextResponse.json({ error: "Subject or message is too short" }, { status: 400 });
  }

  // Ownership checks on optional links — a ticket may only reference an
  // escrow the user is party to, or a listing the user sells.
  let escrowId: string | null = null;
  let listingId: string | null = null;
  if (data.escrowId) {
    const escrow = await prisma.escrow.findUnique({ where: { id: data.escrowId }, select: { id: true, buyerId: true, sellerId: true } });
    if (!escrow || (escrow.buyerId !== userId && escrow.sellerId !== userId)) {
      return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
    }
    escrowId = escrow.id;
  }
  if (data.listingId) {
    const listing = await prisma.listing.findUnique({ where: { id: data.listingId }, select: { id: true, sellerId: true } });
    if (!listing || listing.sellerId !== userId) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    listingId = listing.id;
  }

  const now = new Date();
  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      subject,
      category: data.category,
      status: "OPEN",
      escrowId,
      listingId,
      lastReplyAt: now,
      messages: {
        create: {
          authorId: userId,
          isStaff: false,
          isInternal: false,
          body: message,
          attachments: (data.attachments && data.attachments.length > 0 ? data.attachments : undefined) as Prisma.InputJsonValue | undefined,
        },
      },
    },
    select: { id: true, number: true, subject: true, status: true, category: true, createdAt: true },
  });

  // Same mechanism as /api/kyc/verify: online admins get a queue-update toast.
  emitToAdmins("admin_queue_update", { type: "new_support_ticket", ticketId: ticket.id, number: ticket.number });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, username: true } });
  if (user?.email) {
    const { subject: emailSubject, html } = supportTicketCreatedTemplate(user.name ?? "there", ticket.number, ticket.subject, ticket.id);
    sendEmail({ to: user.email, subject: emailSubject, html }).catch(() => null);
  }

  // Optional ops mailbox heads-up (mirrors risk.ts). No-op when unset.
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const who = user?.username ?? user?.email ?? userId;
    const { subject: adminSubject, html } = adminNotifyTemplate(
      "team",
      `New support ticket #${ticket.number}: ${ticket.subject}`,
      `${who} opened a ${data.category.toLowerCase()} ticket. Review it at ${appUrl()}/admin/support?ticket=${ticket.id}`,
    );
    sendEmail({ to: adminEmail, subject: adminSubject, html }).catch(() => null);
  }

  return NextResponse.json({ ticket }, { status: 201 });
}
