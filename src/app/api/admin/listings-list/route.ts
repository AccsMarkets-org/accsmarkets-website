import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const session = await requireAdmin("MANAGE_LISTINGS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "PENDING";
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10) || 0);

  const where: Record<string, unknown> = { status };
  if (q) {
    where.OR = [{ title: { contains: q } }, { platform: { contains: q } }];
  }

  const listings = await prisma.listing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    include: { seller: { select: { id: true, username: true, email: true } } },
  });

  const hasMore = listings.length > PAGE_SIZE;
  return NextResponse.json({ listings: listings.slice(0, PAGE_SIZE), hasMore, page });
}
