import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { EscrowStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireAdmin("MANAGE_ESCROW_MESSAGES");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status") ?? "FUNDED";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0") || 0);
  const pageSize = 30;

  const isValidStatus = Object.values(EscrowStatus).includes(statusParam as EscrowStatus);
  const whereClause = (!isValidStatus || statusParam === "ALL") ? {} : { status: statusParam as EscrowStatus };

  const [total, escrows] = await Promise.all([
    prisma.escrow.count({ where: whereClause }),
    prisma.escrow.findMany({
      where: whereClause,
      skip: page * pageSize,
      take: pageSize,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        status: true,
        amount: true,
        createdAt: true,
        updatedAt: true,
        buyer: { select: { id: true, name: true, email: true, username: true } },
        seller: { select: { id: true, name: true, email: true, username: true } },
        listing: { select: { id: true, title: true } },
        _count: { select: { messages: true } },
        messages: {
          where: { isPinned: true },
          orderBy: { pinnedAt: "desc" },
          take: 3,
          select: { id: true, content: true, pinnedAt: true, sender: { select: { name: true, role: true } } },
        },
      },
    }),
  ]);

  return NextResponse.json({
    escrows,
    pagination: { page, pageSize, total, hasMore: (page + 1) * pageSize < total },
  });
}
