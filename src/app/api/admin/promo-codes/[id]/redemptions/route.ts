import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

/** GET /api/admin/promo-codes/[id]/redemptions?page=0 — who redeemed a code and when. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_MARKETING");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0") || 0);

  const promo = await prisma.promoCode.findUnique({ where: { id: params.id }, select: { id: true, code: true, type: true } });
  if (!promo) return NextResponse.json({ error: "Promo code not found" }, { status: 404 });

  const [total, rows] = await Promise.all([
    prisma.promoRedemption.count({ where: { promoCodeId: promo.id } }),
    prisma.promoRedemption.findMany({
      where: { promoCodeId: promo.id },
      orderBy: { redeemedAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        redeemedAt: true,
        consumedAt: true,
        user: { select: { id: true, name: true, username: true, email: true } },
      },
    }),
  ]);

  return NextResponse.json({
    promo,
    redemptions: rows,
    pagination: { page, pageSize: PAGE_SIZE, hasMore: (page + 1) * PAGE_SIZE < total },
  });
}
