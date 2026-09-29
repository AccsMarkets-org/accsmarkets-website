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

  const where = { provider: "tagadapay", ...(status ? { status } : {}) };

  const [payments, total] = await Promise.all([
    prisma.fiatPayment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 50,
      take: 50,
      include: { user: { select: { username: true, email: true } } },
    }),
    prisma.fiatPayment.count({ where }),
  ]);

  return NextResponse.json({ payments, total, page });
}
