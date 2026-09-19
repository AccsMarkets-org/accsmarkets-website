import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const role = searchParams.get("role") ?? undefined;
  const isBanned = searchParams.get("isBanned");

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { username: { contains: q } },
      { name: { contains: q } },
    ];
  }
  if (role) where.role = role;
  if (isBanned === "true") where.isBanned = true;
  if (isBanned === "false") where.isBanned = false;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        image: true,
        isBanned: true,
        role: true,
        verifiedBadge: true,
        countryCode: true,
        kycLevel: true,
        trustScore: true,
        walletBalance: true,
        createdAt: true,
        _count: { select: { listings: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const hasMore = users.length > PAGE_SIZE;
  return NextResponse.json({ users: users.slice(0, PAGE_SIZE), total, hasMore, page });
}
