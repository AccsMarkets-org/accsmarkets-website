import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const where = status ? { status: status as never } : {};

  const [orders, total] = await Promise.all([
    prisma.bankTransferOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 50,
      take: 50,
      include: {
        user: { select: { username: true, email: true } },
        bankAccount: { select: { bankName: true, currency: true } },
      },
    }),
    prisma.bankTransferOrder.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page });
}
