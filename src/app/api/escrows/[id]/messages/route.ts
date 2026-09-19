import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scoreContent } from "@/lib/moderation";
import { sanitizeText } from "@/lib/sanitize";
import { emitToRoom, escrowRoom } from "@/lib/socket";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

export const dynamic = "force-dynamic";

const sendSchema = z.object({ content: z.string().trim().min(1).max(2000) });

async function loadEscrowForParticipant(escrowId: string, userId: string, role: string) {
  const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
  if (!escrow) return null;
  const isParticipant = escrow.buyerId === userId || escrow.sellerId === userId;
  if (!isParticipant && role !== "ADMIN") return null;
  return escrow;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const escrow = await loadEscrowForParticipant(params.id, session.user.id, session.user.role);
  if (!escrow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: { escrowId: escrow.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { sender: { select: { id: true, username: true, name: true, role: true } } },
  });

  const pinned = messages.filter((m) => m.isPinned);

  return NextResponse.json({ messages, pinned });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const escrow = await loadEscrowForParticipant(params.id, session.user.id, session.user.role);
  if (!escrow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const content = sanitizeText(parsed.data.content);
  const moderation = scoreContent(content, "message");
  if (moderation.blocked) {
    return NextResponse.json(
      { error: "Message blocked by moderation. Keep the conversation on-platform and scam-free." },
      { status: 422 },
    );
  }

  const recipientId =
    session.user.id === escrow.buyerId
      ? escrow.sellerId
      : session.user.id === escrow.sellerId
        ? escrow.buyerId
        : escrow.buyerId; // admin messages default to notifying the buyer thread-wide

  const message = await prisma.message.create({
    data: {
      conversationId: `escrow_${escrow.id}`,
      senderId: session.user.id,
      recipientId,
      escrowId: escrow.id,
      content,
      moderationFlagged: moderation.score > 0,
    },
    include: { sender: { select: { id: true, username: true, name: true, role: true } } },
  });

  emitToRoom(escrowRoom(escrow.id), "new_escrow_message", { message });

  // Notify both counterparties (skip the sender). Notification only — chat page shows content.
  const targets = [escrow.buyerId, escrow.sellerId].filter((id) => id !== session.user.id);
  for (const userId of targets) {
    await createNotification({
      userId,
      type: "MESSAGE",
      title: "New escrow message",
      body: content.slice(0, 80),
      link: `/dashboard/escrows/${escrow.id}`,
    });
  }

  return NextResponse.json({ message }, { status: 201 });
}
