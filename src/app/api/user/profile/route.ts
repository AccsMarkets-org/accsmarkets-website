import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(60).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  imageUrl: z.string().url().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const { name, username, imageUrl } = parsed.data;

  if (username) {
    const existing = await prisma.user.findFirst({
      where: { username, id: { not: session.user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name && { name }),
      ...(username && { username }),
      ...(imageUrl && { image: imageUrl }),
    },
    select: {
      id: true, name: true, username: true, email: true,
      image: true, role: true, kycLevel: true,
      walletBalance: true, trustScore: true, verifiedBadge: true,
    },
  });

  return NextResponse.json({ user });
}
