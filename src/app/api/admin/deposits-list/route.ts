import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 60;

export async function GET(req: NextRequest) {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "waiting";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10) || 0);

  const deposits = await prisma.cryptoWallet.findMany({
    where: { isManual: true, ...(status !== "all" ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { user: { select: { id: true, username: true, email: true } } },
  });

  return NextResponse.json({ deposits, page });
}
