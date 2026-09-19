import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyIpnSignature } from "@/lib/nowpayments";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { depositConfirmedTemplate } from "@/lib/email-templates";
import { formatCurrency } from "@/lib/utils";

const CREDIT_STATUSES = new Set(["finished", "confirmed", "partially_paid"]);

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-nowpayments-sig");
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;

  if (!secret || !verifyIpnSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as {
    payment_id: number | string;
    payment_status: string;
    actually_paid?: number;
    price_amount?: number;
  };
  const paymentId = String(payload.payment_id);

  const wallet = await prisma.cryptoWallet.findUnique({ where: { paymentId } });
  if (!wallet) {
    // Unknown payment id — acknowledge so NOWPayments stops retrying, nothing to credit.
    return NextResponse.json({ received: true });
  }

  if (!CREDIT_STATUSES.has(payload.payment_status)) {
    await prisma.cryptoWallet.update({
      where: { id: wallet.id },
      data: { status: payload.payment_status },
    });
    return NextResponse.json({ received: true });
  }

  // Idempotency guard: only credit once. A second IPN for the same payment_id
  // (NOWPayments retries) is a no-op once the wallet is already confirmed.
  if (wallet.status === "confirmed") {
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }

  // For partially_paid, credit the actually-paid USD amount rather than the full request.
  const creditUsd =
    payload.payment_status === "partially_paid" &&
    typeof payload.actually_paid === "number" &&
    typeof payload.price_amount === "number" &&
    payload.price_amount > 0
      ? Math.min(Number(wallet.amountUsd), (payload.actually_paid / payload.price_amount) * Number(wallet.amountUsd))
      : Number(wallet.amountUsd);

  const result = await prisma.$transaction(async (tx) => {
    const freshWallet = await tx.cryptoWallet.findUniqueOrThrow({ where: { id: wallet.id } });
    if (freshWallet.status === "confirmed") return null; // race guard under concurrent IPNs

    const transaction = await tx.transaction.findFirst({
      where: { cryptoPaymentId: paymentId, status: "PENDING" },
    });
    if (!transaction) return null;

    const user = await tx.user.findUniqueOrThrow({ where: { id: freshWallet.userId } });
    const newBalance = Number(user.walletBalance) + creditUsd;

    await tx.cryptoWallet.update({
      where: { id: freshWallet.id },
      data: { status: "confirmed", confirmedAt: new Date() },
    });
    await tx.transaction.update({
      where: { id: transaction.id },
      data: { status: "COMPLETED", amount: creditUsd, balanceAfter: newBalance },
    });
    await tx.user.update({ where: { id: user.id }, data: { walletBalance: { increment: creditUsd } } });

    return { user, amountUsd: creditUsd, transaction };
  });

  if (result) {
    // Check if this is a subscription payment (metadata.planId present)
    const txMeta = result.transaction?.metadata as Record<string, unknown> | null | undefined;
    if (txMeta?.planId) {
      // Activate subscription: set plan + 30-day expiry
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: result.user.id },
        data: { subscriptionPlanId: txMeta.planId as string, subscriptionExpiresAt: expiresAt },
      });
      await createNotification({
        userId: result.user.id,
        type: "SYSTEM",
        title: "Subscription activated",
        body: "Your subscription plan is now active.",
        link: "/dashboard/settings/subscription",
      });
    } else {
      await createNotification({
        userId: result.user.id,
        type: "DEPOSIT_CONFIRMED",
        title: "Deposit confirmed",
        body: `${formatCurrency(result.amountUsd)} has been credited to your wallet.`,
        link: "/dashboard/wallet",
      });
      const { subject, html } = depositConfirmedTemplate(
        result.user.name ?? "there",
        formatCurrency(result.amountUsd),
      );
      await sendEmail({ to: result.user.email, subject, html, slug: "deposit_confirmed" });
    }
  }

  return NextResponse.json({ received: true });
}
