import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cryptoDepositSchema } from "@/lib/validation/wallet";
import { createNowPayment } from "@/lib/nowpayments";
import { createNotification } from "@/lib/notifications";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Returns the user's active (waiting) NowPayments deposit so the UI can resume it.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pending = await prisma.cryptoWallet.findFirst({
    where: {
      userId: session.user.id,
      status: "waiting",
      isManual: false,
      address: { not: null },
      paymentId: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!pending) return NextResponse.json({ pending: null });

  return NextResponse.json({
    pending: {
      walletId: pending.id,
      address: pending.address,
      amountCrypto: Number(pending.amountCrypto),
      currency: pending.currency,
      network: pending.network,
      amountUsd: Number(pending.amountUsd),
    },
  });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = cryptoDepositSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { amountUsd, network } = parsed.data;

    if (!process.env.NOWPAYMENTS_API_KEY) {
      return NextResponse.json({ error: "Crypto deposits are temporarily unavailable. Please use Manual USDT or Bank Wire." }, { status: 503 });
    }

    const settings = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });
    const minDeposit = Number(settings?.minDeposit ?? 10);
    if (amountUsd < minDeposit) {
      return NextResponse.json({ error: `Minimum deposit is $${minDeposit}` }, { status: 400 });
    }

    const wallet = await prisma.cryptoWallet.create({
      data: {
        userId: session.user.id,
        network,
        amountUsd,
        currency: network,
        status: "waiting",
      },
    });

    let payment;
    try {
      payment = await createNowPayment(amountUsd, network, wallet.id);
    } catch (err) {
      await prisma.cryptoWallet.update({ where: { id: wallet.id }, data: { status: "failed" } }).catch(() => null);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to create payment" },
        { status: 502 },
      );
    }

    const updated = await prisma.cryptoWallet.update({
      where: { id: wallet.id },
      data: {
        paymentId: payment.paymentId,
        address: payment.payAddress,
        amountCrypto: payment.payAmount,
        currency: payment.payCurrency,
      },
    });

    const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        type: "DEPOSIT",
        status: "PENDING",
        amount: amountUsd,
        balanceBefore: currentUser.walletBalance,
        balanceAfter: currentUser.walletBalance,
        cryptoPaymentId: payment.paymentId,
        metadata: { cryptoWalletId: wallet.id, network },
      },
    });

    await createNotification({
      userId: session.user.id,
      type: "PAYMENT",
      title: "Deposit initiated",
      body: `Send ${updated.amountCrypto} ${updated.currency} to complete your ${formatCurrency(amountUsd)} deposit.`,
      link: "/dashboard/wallet",
    });

    return NextResponse.json({
      walletId: updated.id,
      address: updated.address,
      amountCrypto: updated.amountCrypto,
      currency: updated.currency,
    });
  } catch (err) {
    console.error("[wallet/deposit]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
