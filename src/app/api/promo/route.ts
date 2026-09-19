import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const redeemSchema = z.object({ code: z.string().trim().min(1).max(50) });

/** POST /api/promo — validate + redeem a promo code */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const promo = await prisma.promoCode.findUnique({ where: { code: parsed.data.code } });
  if (!promo) return NextResponse.json({ error: "Invalid or unknown promo code" }, { status: 404 });
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return NextResponse.json({ error: "This promo code has expired" }, { status: 400 });
  }
  if (promo.maxRedemptions !== null && promo.redemptionCount >= promo.maxRedemptions) {
    return NextResponse.json({ error: "This promo code has reached its maximum uses" }, { status: 400 });
  }

  const alreadyUsed = await prisma.promoRedemption.findUnique({
    where: { promoCodeId_userId: { promoCodeId: promo.id, userId: session.user.id } },
  });
  if (alreadyUsed) return NextResponse.json({ error: "You have already used this promo code" }, { status: 409 });

  // Apply the promo
  await prisma.$transaction(async (tx) => {
    await tx.promoRedemption.create({ data: { promoCodeId: promo.id, userId: session.user.id } });
    await tx.promoCode.update({
      where: { id: promo.id },
      data: { redemptionCount: { increment: 1 } },
    });

    if (promo.type === "FLAT_CREDIT") {
      const creditAmount = Number(promo.value);
      const user = await tx.user.findUniqueOrThrow({ where: { id: session.user.id } });
      const newBalance = Number(user.walletBalance) + creditAmount;
      await tx.user.update({ where: { id: session.user.id }, data: { walletBalance: { increment: creditAmount } } });
      await tx.transaction.create({
        data: {
          userId: session.user.id,
          type: "PROMOTION",
          status: "COMPLETED",
          amount: creditAmount,
          balanceBefore: user.walletBalance,
          balanceAfter: newBalance,
        },
      });
    }
  });

  return NextResponse.json({
    ok: true,
    type: promo.type,
    value: Number(promo.value),
    message:
      promo.type === "FLAT_CREDIT"
        ? `$${Number(promo.value).toFixed(2)} added to your wallet!`
        : `${Number(promo.value).toFixed(0)}% discount applied to your next escrow fee.`,
  });
}

/** GET /api/promo?code=XXX — preview without redeeming */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, reason: "expired" });
  }
  if (promo.maxRedemptions !== null && promo.redemptionCount >= promo.maxRedemptions) {
    return NextResponse.json({ valid: false, reason: "limit_reached" });
  }
  return NextResponse.json({ valid: true, type: promo.type, value: Number(promo.value) });
}
