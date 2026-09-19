import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { createdAt: "desc" },
  }).catch(() => []);
  return NextResponse.json({ announcements }, {
    headers: { "Cache-Control": "no-store" },
  });
}
