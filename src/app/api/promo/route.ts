import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const redeemSchema = z.object({ code: z.string().trim().min(1).max(50) });

// 10 redeem attempts per user per hour — codes are guessable strings, so this
// caps brute-force enumeration without getting in the way of a real user.
const REDEEM_LIMIT = 10;
const REDEEM_WINDOW_SECONDS = 60 * 60;

/** Codes created by admins are uppercased; accept either spelling from the user. */
async function findPromo(code: string) {
  return (
    (await prisma.promoCode.findUnique({ where: { code } })) ??
    (await prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } }))
  );
}

/**
 * POST /api/promo — validate + redeem a promo code.
 *  - FLAT_CREDIT:     credits the wallet immediately (Transaction type PROMOTION).
 *  - PERCENT_OFF_FEE: records a redemption; the discount is applied to the user's
 *                     next escrow checkout (POST /api/escrows) and marked consumed.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(`promo-redeem:${session.user.id}`, REDEEM_LIMIT, REDEEM_WINDOW_SECONDS);
  if (!allowed) {
    return NextResponse.json({ error: "Too many promo code attempts. Try again in an hour." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const promo = await findPromo(parsed.data.code);
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
  try {
    await prisma.$transaction(async (tx) => {
      // Re-check the cap inside the tx so concurrent redeems can't overshoot it.
      const claimed = await tx.promoCode.updateMany({
        where: {
          id: promo.id,
          ...(promo.maxRedemptions !== null ? { redemptionCount: { lt: promo.maxRedemptions } } : {}),
        },
        data: { redemptionCount: { increment: 1 } },
      });
      if (claimed.count === 0) throw new Error("LIMIT_REACHED");

      await tx.promoRedemption.create({
        data: {
          promoCodeId: promo.id,
          userId: session.user.id,
          // A flat credit is spent the moment it's granted; only fee discounts
          // stay "open" until an escrow consumes them.
          consumedAt: promo.type === "FLAT_CREDIT" ? new Date() : null,
        },
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
            metadata: { promoCodeId: promo.id, promoCode: promo.code, kind: "PROMO_CREDIT" },
          },
        });
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "LIMIT_REACHED") {
      return NextResponse.json({ error: "This promo code has reached its maximum uses" }, { status: 400 });
    }
    // Unique(promoCodeId, userId) race: two parallel redeems by the same user.
    if (err && typeof err === "object" && (err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "You have already used this promo code" }, { status: 409 });
    }
    console.error("[promo POST]", err);
    return NextResponse.json({ error: "Could not redeem promo code. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    code: promo.code,
    type: promo.type,
    value: Number(promo.value),
    message:
      promo.type === "FLAT_CREDIT"
        ? `$${Number(promo.value).toFixed(2)} added to your wallet!`
        : `${Number(promo.value).toFixed(0)}% discount applied to your next escrow fee.`,
  });
}

/**
 * GET /api/promo?code=XXX — preview a code without redeeming.
 * GET /api/promo          — the signed-in user's pending (unconsumed) fee discount, if any.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const now = new Date();
    const pending = await prisma.promoRedemption.findFirst({
      where: {
        userId: session.user.id,
        consumedAt: null,
        promoCode: { type: "PERCENT_OFF_FEE", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      },
      orderBy: { redeemedAt: "desc" },
      include: { promoCode: { select: { code: true, type: true, value: true } } },
    });
    return NextResponse.json({
      pending: pending
        ? { code: pending.promoCode.code, type: pending.promoCode.type, value: Number(pending.promoCode.value) }
        : null,
    });
  }

  const promo = await findPromo(code);
  if (!promo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, reason: "expired" });
  }
  if (promo.maxRedemptions !== null && promo.redemptionCount >= promo.maxRedemptions) {
    return NextResponse.json({ valid: false, reason: "limit_reached" });
  }
  return NextResponse.json({ valid: true, type: promo.type, value: Number(promo.value) });
}
