import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function getIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const ip = getIp(req.headers as unknown as Headers);
  const ua = req.headers.get("user-agent") ?? undefined;

  const existing = await prisma.activeSession.findFirst({
    where: {
      userId: session.user.id,
      ip,
      userAgent: ua ?? null,
      lastSeenAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
    },
    orderBy: { lastSeenAt: "desc" },
  });

  const now = new Date();

  if (existing) {
    await prisma.activeSession.update({ where: { id: existing.id }, data: { lastSeenAt: now } });
  } else {
    await prisma.activeSession.create({ data: { userId: session.user.id, ip, userAgent: ua } });
    const old = await prisma.activeSession.findMany({
      where: { userId: session.user.id },
      orderBy: { lastSeenAt: "desc" },
      skip: 10,
      select: { id: true },
    });
    if (old.length > 0) {
      await prisma.activeSession.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
    }
  }

  // Keep user.lastSeenAt in sync so presence lookups read correct data
  await prisma.user.update({ where: { id: session.user.id }, data: { lastSeenAt: now } });

  return NextResponse.json({ ok: true });
}
