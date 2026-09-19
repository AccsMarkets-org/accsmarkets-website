import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = "force-dynamic";

// GET /api/escrow/chat?partnerId=xxx
// Returns the most recent active escrow between the current user and partnerId
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const partnerId = searchParams.get('partnerId');
  if (!partnerId) return NextResponse.json({ escrow: null });

  const userId = session.user.id;

  const escrow = await prisma.escrow.findFirst({
    where: {
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
      OR: [
        { buyerId: userId, sellerId: partnerId },
        { buyerId: partnerId, sellerId: userId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      amount: true,
      listing: { select: { title: true } },
    },
  });

  if (!escrow) return NextResponse.json({ escrow: null });

  return NextResponse.json({
    escrow: {
      id: escrow.id,
      status: escrow.status,
      amount: Number(escrow.amount),
      listingTitle: escrow.listing?.title ?? 'Account Purchase',
    },
  });
}
