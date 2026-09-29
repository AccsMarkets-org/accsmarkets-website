import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cryptoDepositSchema } from "@/lib/validation/wallet";
import { createNowPayment } from "@/lib/nowpayments";
import { createNotification } from "@/lib/notifications";
import { calculateDepositFee } from "@/lib/fees";
import { formatCurrency } from "@/lib/utils";
import { emitToAdmins } from "@/lib/socket";

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

    const [settings, feeConfig] = await Promise.all([
      prisma.platformSettings.findUnique({ where: { id: "singleton" } }),
      prisma.depositMethodFee.findUnique({ where: { method: "crypto" } }),
    ]);
    const minDeposit = Number(settings?.minDeposit ?? 10);
    if (amountUsd < minDeposit) {
      return NextResponse.json({ error: `Minimum deposit is $${minDeposit}` }, { status: 400 });
    }

    const feeRate = feeConfig ? Number(feeConfig.feeRate) : 0;
    const minFee = feeConfig ? Number(feeConfig.minFee) : 0;
    const maxFee = feeConfig?.maxFee != null ? Number(feeConfig.maxFee) : null;
    const feeUsd = calculateDepositFee(amountUsd, feeRate, minFee, maxFee);
    // wallet.amountUsd stays the credit target (what the webhook pays into the
    // balance) -- only the amount actually requested from NOWPayments below
    // includes the fee, so the customer sends totalDue in crypto but is
    // credited exactly amountUsd once it's confirmed.
    const totalDue = amountUsd + feeUsd;

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
      payment = await createNowPayment(totalDue, network, wallet.id);
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
        metadata: { cryptoWalletId: wallet.id, network, feeUsd, totalDue },
      },
    });

    await createNotification({
      userId: session.user.id,
      type: "PAYMENT",
      title: "Deposit initiated",
      body: `Send ${updated.amountCrypto} ${updated.currency} to complete your ${formatCurrency(amountUsd)} deposit.`,
      link: "/dashboard/wallet",
    });

    // Notify online admins so their queue count badge updates without a page reload.
    emitToAdmins("admin_queue_update", { type: "new_deposit" });

    return NextResponse.json({
      walletId: updated.id,
      address: updated.address,
      amountCrypto: updated.amountCrypto,
      currency: updated.currency,
      feeUsd,
      totalDue,
    });
  } catch (err) {
    console.error("[wallet/deposit]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
