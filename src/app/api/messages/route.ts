import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendMessageSchema } from "@/lib/validation/message";
import { scoreContent } from "@/lib/moderation";
import { checkRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import { sanitizeText } from "@/lib/sanitize";
import { conversationId, emitToUser } from "@/lib/socket";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { newMessageTemplate } from "@/lib/email-templates";
import { requiresPhoneVerification, phoneVerificationRequiredResponse } from "@/lib/phone-gate";

export const dynamic = "force-dynamic";

function previewContent(content: string): string {
  if (content.startsWith('{"_type":"chat_offer"')) {
    try {
      const d = JSON.parse(content) as { listingTitle?: string; price?: number };
      const title = d.listingTitle ? ` · ${d.listingTitle}` : "";
      const price = d.price != null ? ` — $${Number(d.price).toFixed(2)}` : "";
      return `💰 Price offer${title}${price}`;
    } catch { /* fall through */ }
  }
  return content;
}

/** GET: conversation list — one entry per partner, newest message first. */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  // DMs only (escrow chat lives on the escrow page).
  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") ?? "inbox";
    const isArchived = tab === "archived";

    const messages = await prisma.message.findMany({
      where: {
        escrowId: null,
        isArchived,
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      orderBy: { createdAt: "desc" },
      take: 400,
      include: {
        sender: { select: { id: true, username: true, name: true, image: true } },
      },
    });

    // Deduplicate by partner.
    const partnerIds = new Set<string>();
    const conversations: {
      partnerId: string;
      lastMessage: (typeof messages)[number];
      unreadCount: number;
    }[] = [];

    for (const message of messages) {
      const partnerId = message.senderId === userId ? message.recipientId : message.senderId;
      if (partnerIds.has(partnerId)) continue;
      partnerIds.add(partnerId);
      conversations.push({ partnerId, lastMessage: message, unreadCount: 0 });
    }

    // Partner profiles + unread counts.
    const partners = await prisma.user.findMany({
      where: { id: { in: Array.from(partnerIds) } },
      select: { id: true, username: true, name: true, image: true, verifiedBadge: true, lastSeenAt: true },
    });
    const unread = await prisma.message.groupBy({
      by: ["senderId"],
      where: { escrowId: null, recipientId: userId, isRead: false, isArchived: false },
      _count: true,
    });
    const unreadMap = new Map(unread.map((u) => [u.senderId, u._count]));
    const partnerMap = new Map(partners.map((p) => [p.id, p]));

    // Look up active escrows between the current user and each partner
    const activeEscrows = await prisma.escrow.findMany({
      where: {
        status: { in: ["FUNDED", "AWAITING_MANAGER_ADD", "PENDING_VERIFICATION", "SUBMITTED", "VERIFIED", "IN_TRANSFER", "DISPUTED"] },
        OR: [
          { buyerId: userId, sellerId: { in: Array.from(partnerIds) } },
          { sellerId: userId, buyerId: { in: Array.from(partnerIds) } },
        ],
      },
      select: {
        id: true, status: true, buyerId: true, sellerId: true,
        listing: { select: { title: true } },
      },
    });

    // Map partner → escrow
    const escrowByPartner = new Map<string, typeof activeEscrows[number]>();
    for (const e of activeEscrows) {
      const partnerId = e.buyerId === userId ? e.sellerId : e.buyerId;
      if (!escrowByPartner.has(partnerId)) escrowByPartner.set(partnerId, e);
    }

    const settings = await prisma.platformSettings.findUnique({
      where: { id: "singleton" },
      select: { officialSupportUserId: true },
    });
    const officialId = settings?.officialSupportUserId ?? null;

    // Always inject the official support thread into the inbox, even if no messages exist yet.
    if (officialId && !isArchived && !partnerIds.has(officialId)) {
      const supportUser = await prisma.user.findUnique({
        where: { id: officialId },
        select: { id: true, username: true, name: true, image: true, verifiedBadge: true, lastSeenAt: true },
      });
      if (supportUser) {
        partnerMap.set(officialId, supportUser);
        conversations.unshift({
          partnerId: officialId,
          lastMessage: {
            id: "",
            content: "Welcome to AccsMarkets! Message us anytime for support.",
            createdAt: new Date(),
            senderId: officialId,
            recipientId: userId,
            isRead: true,
            isArchived: false,
            escrowId: null,
            moderationFlagged: false,
            conversationId: "",
            sender: supportUser,
          } as never,
          unreadCount: 0,
        });
      }
    }

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        partner: partnerMap.get(c.partnerId) ?? { id: c.partnerId, username: null, name: "Unknown", image: null },
        lastMessage: {
          content: previewContent(c.lastMessage.content),
          createdAt: c.lastMessage.createdAt,
          fromMe: c.lastMessage.senderId === userId,
        },
        unreadCount: unreadMap.get(c.partnerId) ?? 0,
        activeEscrow: escrowByPartner.get(c.partnerId) ?? null,
        isPinned: officialId !== null && c.partnerId === officialId,
      })),
    });
  } catch {
    return NextResponse.json({ conversations: [] }, { status: 503 });
  }
}

/** POST: send a DM. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(
    `messages:${session.user.id}`,
    RATE_LIMITS.MESSAGES.limit,
    RATE_LIMITS.MESSAGES.windowSeconds,
  );
  if (!allowed) {
    return NextResponse.json({ error: "You're sending messages too fast." }, { status: 429 });
  }

  if (await requiresPhoneVerification(session.user.id)) {
    return NextResponse.json(phoneVerificationRequiredResponse(), { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { recipientId, attachmentUrl, attachmentName } = parsed.data;
  const listingId: string | null = (body as Record<string, unknown>)?.listingId as string ?? null;
  const content = sanitizeText(parsed.data.content);

  if (recipientId === session.user.id) {
    return NextResponse.json({ error: "You can't message yourself." }, { status: 400 });
  }
  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, isBanned: true, email: true, name: true, username: true },
  });
  if (!recipient || recipient.isBanned) {
    return NextResponse.json({ error: "Recipient not found." }, { status: 404 });
  }

  const LINK_RE = /https?:\/\/[^\s]+/gi;
  const PLAIN_URL_RE = /(?<!\w)([\w-]+\.(?:com|org|net|io|co|me|gg|tv|app|xyz|info|shop|ly|link|cc|to|ru|cn|uk|de|fr|es|br|in|pk))(?=[/\s?#]|$)/gi;
  const hadLink = LINK_RE.test(content) || PLAIN_URL_RE.test(content);
  let finalContent = content
    .replace(/https?:\/\/[^\s]+/gi, "[link removed]")
    .replace(/(?<!\w)([\w-]+\.(?:com|org|net|io|co|me|gg|tv|app|xyz|info|shop|ly|link|cc|to|ru|cn|uk|de|fr|es|br|in|pk))(?=[/\s?#]|$)/gi, "[link removed]");

  const moderation = scoreContent(finalContent, "message");
  if (moderation.blocked) {
    return NextResponse.json(
      { error: "Message blocked by moderation. Keep deals on-platform and scam-free." },
      { status: 422 },
    );
  }
  // Tell client a link was stripped so it can show a warning toast
  const linkStripped = hadLink;

  // Only attach listingId if the listing actually exists (prevent orphan refs)
  let resolvedListingId: string | null = null;
  if (listingId) {
    const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true } });
    resolvedListingId = listing?.id ?? null;
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversationId(session.user.id, recipientId),
      senderId: session.user.id,
      recipientId,
      content: finalContent,
      attachmentUrl: attachmentUrl ?? null,
      attachmentName: attachmentName ?? null,
      moderationFlagged: moderation.score > 0,
      listingId: resolvedListingId,
    },
    include: { sender: { select: { id: true, username: true, name: true, image: true } } },
  });

  emitToUser(recipientId, "new_message", { message });
  await createNotification({
    userId: recipientId,
    type: "MESSAGE",
    title: `New message from ${message.sender.username ?? message.sender.name}`,
    body: finalContent.slice(0, 80),
    link: `/dashboard/messages/${session.user.id}`,
  });

  if (recipient.email) {
    const senderName = message.sender.username ?? message.sender.name ?? "Someone";
    const recipientName = recipient.name ?? recipient.username ?? "there";
    const tpl = newMessageTemplate(recipientName, senderName, finalContent.slice(0, 120));
    sendEmail({ to: recipient.email, subject: tpl.subject, html: tpl.html }).catch(() => null);
  }

  return NextResponse.json({ message, linkStripped }, { status: 201 });
}
