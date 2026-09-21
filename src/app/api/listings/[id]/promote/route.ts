import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const PROMOTION_PRICES: Record<string, { usd: number; days: number; label: string }> = {
  FEATURED_BOOST:    { usd: 9.99,  days: 7,  label: "Featured Boost" },
  PREMIUM_FEATURED:  { usd: 19.99, days: 14, label: "Premium Featured" },
  PINNED:            { usd: 4.99,  days: 7,  label: "Pinned" },
};

const BUMP_PRICE_USD = 2.00;
const BUMP_COOLDOWN_HOURS = 24;
const LOW_BALANCE_THRESHOLD_USD = 5;

// Heads-up after a successful debit leaves the wallet nearly empty, so the next
// boost/purchase doesn't fail on "Insufficient wallet balance" by surprise.
function warnIfLowBalance(userId: string, balanceAfter: number | null) {
  if (balanceAfter === null || balanceAfter >= LOW_BALANCE_THRESHOLD_USD) return;
  createNotification({
    userId,
    type: "PAYMENT",
    title: "Your wallet balance is low",
    body: `Your wallet balance is now $${balanceAfter.toFixed(2)}. Top up to keep promoting listings and funding escrows.`,
    link: "/dashboard/wallet/deposit",
  }).catch(() => null);
}

const schema = z.object({
  type: z.enum(["FEATURED_BOOST", "PREMIUM_FEATURED", "PINNED", "BUMP"]),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const { type } = parsed.data;

  const listing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  if (listing.sellerId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (listing.status !== "ACTIVE")
    return NextResponse.json({ error: "Only active listings can be promoted" }, { status: 400 });

  // BUMP: 24h cooldown check
  if (type === "BUMP") {
    if (listing.lastBumpedAt) {
      const hoursSince = (Date.now() - listing.lastBumpedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince < BUMP_COOLDOWN_HOURS) {
        const remaining = Math.ceil(BUMP_COOLDOWN_HOURS - hoursSince);
        return NextResponse.json({ error: `Bump is on cooldown for ${remaining} more hour(s)` }, { status: 400 });
      }
    }

    // Balance check before tx; authoritative deduct is inside tx via decrement
    const userPre = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
    if (Number(userPre.walletBalance) < BUMP_PRICE_USD)
      return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 400 });

    let bumpBalanceAfter: number | null = null;
    try {
      await prisma.$transaction(async (tx) => {
        // Re-fetch inside tx and guard against concurrent depletion
        const user = await tx.user.findUniqueOrThrow({ where: { id: session.user.id } });
        if (Number(user.walletBalance) < BUMP_PRICE_USD)
          throw Object.assign(new Error("INSUFFICIENT"), { code: "INSUFFICIENT" });
        const newBalance = Number(user.walletBalance) - BUMP_PRICE_USD;
        bumpBalanceAfter = newBalance;
        await tx.user.update({ where: { id: user.id }, data: { walletBalance: { decrement: BUMP_PRICE_USD } } });
        await tx.listing.update({
          where: { id: listing.id },
          data: { lastBumpedAt: new Date(), updatedAt: new Date() },
        });
        await tx.transaction.create({
          data: {
            userId: user.id,
            type: "BUMP",
            status: "COMPLETED",
            amount: BUMP_PRICE_USD,
            balanceBefore: user.walletBalance,
            balanceAfter: newBalance,
            metadata: { listingId: listing.id, promotionType: "BUMP" },
          },
        });
      });
    } catch (err) {
      if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === "INSUFFICIENT")
        return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 400 });
      return NextResponse.json({ error: "Promotion failed" }, { status: 500 });
    }

    warnIfLowBalance(session.user.id, bumpBalanceAfter);
    return NextResponse.json({ ok: true, type: "BUMP" });
  }

  // Other promotion types
  const promo = PROMOTION_PRICES[type];
  const userPre = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (Number(userPre.walletBalance) < promo.usd)
    return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 400 });

  const expiresAt = new Date(Date.now() + promo.days * 24 * 60 * 60 * 1000);

  let promoBalanceAfter: number | null = null;
  try {
    await prisma.$transaction(async (tx) => {
      // Re-fetch inside tx and guard against concurrent depletion
      const user = await tx.user.findUniqueOrThrow({ where: { id: session.user.id } });
      if (Number(user.walletBalance) < promo.usd)
        throw Object.assign(new Error("INSUFFICIENT"), { code: "INSUFFICIENT" });
      const newBalance = Number(user.walletBalance) - promo.usd;
      promoBalanceAfter = newBalance;
      await tx.user.update({ where: { id: user.id }, data: { walletBalance: { decrement: promo.usd } } });
      await tx.listing.update({
        where: { id: listing.id },
        data: {
          isFeatured:        type === "FEATURED_BOOST"   ? true : undefined,
          isPremiumFeatured: type === "PREMIUM_FEATURED" ? true : undefined,
          isPinned:          type === "PINNED"           ? true : undefined,
          featuredUntil:     type !== "PINNED" ? expiresAt : undefined,
          pinnedUntil:       type === "PINNED" ? expiresAt : undefined,
        },
      });
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "PROMOTION",
          status: "COMPLETED",
          amount: promo.usd,
          balanceBefore: user.walletBalance,
          balanceAfter: newBalance,
          metadata: { listingId: listing.id, promotionType: type, expiresAt },
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === "INSUFFICIENT")
      return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 400 });
    return NextResponse.json({ error: "Promotion failed" }, { status: 500 });
  }

  warnIfLowBalance(session.user.id, promoBalanceAfter);
  return NextResponse.json({ ok: true, type, expiresAt });
}
