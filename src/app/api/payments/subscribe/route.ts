import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNowPayment } from "@/lib/nowpayments";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  planId: z.string().min(1),
  network: z.enum(["TRC20", "BEP20", "ERC20", "POLYGON", "SOLANA"]),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const { planId, network } = parsed.data;

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  if (Number(plan.priceMonthly) === 0)
    return NextResponse.json({ error: "FREE plan does not require payment" }, { status: 400 });

  // Create a CryptoWallet row to track this payment (same pattern as deposits).
  const wallet = await prisma.cryptoWallet.create({
    data: {
      userId: session.user.id,
      network,
      amountUsd: plan.priceMonthly,
      currency: network,
      status: "waiting",
    },
  });

  try {
    const payment = await createNowPayment(Number(plan.priceMonthly), network, wallet.id);
    const updated = await prisma.cryptoWallet.update({
      where: { id: wallet.id },
      data: {
        paymentId: payment.paymentId,
        address: payment.payAddress,
        amountCrypto: payment.payAmount,
        currency: payment.payCurrency,
      },
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        type: "SUBSCRIPTION",
        status: "PENDING",
        amount: plan.priceMonthly,
        balanceBefore: user.walletBalance,
        balanceAfter: user.walletBalance,
        cryptoPaymentId: payment.paymentId,
        metadata: { cryptoWalletId: wallet.id, planId, network },
      },
    });

    return NextResponse.json({
      walletId: updated.id,
      address: updated.address,
      amountCrypto: updated.amountCrypto,
      currency: updated.currency,
      planName: plan.name,
    });
  } catch (err) {
    await prisma.cryptoWallet.update({ where: { id: wallet.id }, data: { status: "failed" } });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create payment" },
      { status: 502 },
    );
  }
}
