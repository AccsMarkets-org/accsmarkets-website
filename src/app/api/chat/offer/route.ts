import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { conversationId } from '@/lib/socket';
import { z } from 'zod';

export const dynamic = "force-dynamic";

const schema = z.object({
  recipientId: z.string().min(1),
  listingId: z.string().optional(),
  listingTitle: z.string().optional(),
  amount: z.number().positive(),
  note: z.string().max(500).optional(),
});

// POST /api/chat/offer — mobile app: sends an offer card message in a DM thread
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const { recipientId, listingId, listingTitle, amount, note } = parsed.data;
  const senderId = session.user.id;

  if (recipientId === senderId) {
    return NextResponse.json({ error: 'Cannot send offer to yourself' }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } });
  if (!recipient) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });

  let resolvedTitle = listingTitle ?? 'Custom Offer';
  if (listingId) {
    const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { title: true } });
    if (listing) resolvedTitle = listing.title;
  }

  const convId = conversationId(senderId, recipientId);
  const offerPayload = JSON.stringify({
    type: 'OFFER_CARD',
    listingId: listingId ?? null,
    listingTitle: resolvedTitle,
    amount,
    note: note ?? null,
    senderId,
  });

  const message = await prisma.message.create({
    data: { conversationId: convId, senderId, recipientId, content: offerPayload },
    include: { sender: { select: { id: true, name: true, username: true, image: true } } },
  });

  return NextResponse.json({ message }, { status: 201 });
}
