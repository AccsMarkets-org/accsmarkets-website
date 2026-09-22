import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { pushToken } = (await req.json().catch(() => ({}))) as { pushToken?: unknown };
  if (!pushToken || typeof pushToken !== 'string') {
    return NextResponse.json({ error: 'pushToken required' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { expoPushToken: pushToken },
  });

  return NextResponse.json({ ok: true });
}
