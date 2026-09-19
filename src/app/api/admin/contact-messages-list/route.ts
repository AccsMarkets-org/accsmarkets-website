import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireAdmin("MANAGE_SETTINGS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const unreadOnly = searchParams.get("unread") === "true";

  const messages = await prisma.contactMessage.findMany({
    where: unreadOnly ? { isRead: false } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ messages });
}
