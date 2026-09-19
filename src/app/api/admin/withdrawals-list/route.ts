import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import type { TransactionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 60;

export async function GET(req: NextRequest) {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "PENDING";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));

  const withdrawals = await prisma.transaction.findMany({
    where: { type: "WITHDRAWAL", ...(status !== "all" ? { status: status as TransactionStatus } : {}) },
    orderBy: { createdAt: "desc" },
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { user: { select: { id: true, username: true, email: true, walletBalance: true } } },
  });

  return NextResponse.json({ withdrawals, page });
}
