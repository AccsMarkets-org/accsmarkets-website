import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyIpnSignature } from "@/lib/nowpayments";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { depositConfirmedTemplate, depositRejectedTemplate } from "@/lib/email-templates";
import { appUrl } from "@/lib/email-render";
import { formatCurrency, round2 } from "@/lib/utils";

const CREDIT_STATUSES = new Set(["finished", "confirmed", "partially_paid"]);
// Terminal failure states worth telling the user about -- "waiting",
// "confirming", "sending" etc. are normal in-progress states, not failures,
// and must not trigger a "your deposit failed" email.
const FAILURE_STATUSES = new Set(["failed", "expired", "refunded"]);

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
    if (FAILURE_STATUSES.has(payload.payment_status) && wallet.status !== payload.payment_status) {
      const user = await prisma.user.findUnique({ where: { id: wallet.userId } });
      if (user) {
        await createNotification({
          userId: user.id,
          type: "PAYMENT",
          title: "Deposit failed",
          body: `Your ${wallet.network} deposit could not be completed (${payload.payment_status}).`,
          link: "/dashboard/wallet",
        }).catch(() => null);
        const { subject, html } = depositRejectedTemplate(
          user.name ?? "there",
          formatCurrency(wallet.amountUsd.toString()),
          `Crypto (${wallet.network})`,
          payload.payment_status === "expired"
            ? "The payment window expired before funds arrived."
            : "The network payment did not complete.",
        );
        await sendEmail({ to: user.email, subject, html, slug: "deposit_rejected" }).catch(() => null);
      }
    }
    return NextResponse.json({ received: true });
  }

  // Idempotency guard: only credit once. A second IPN for the same payment_id
  // (NOWPayments retries) is a no-op once the wallet is already confirmed.
  if (wallet.status === "confirmed") {
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }

  // For partially_paid, credit the actually-paid USD amount rather than the full
  // request. Rounded to cents: the ledger amount, balanceAfter and the balance
  // increment must all be the same 2dp figure.
  const creditUsd = round2(
    payload.payment_status === "partially_paid" &&
    typeof payload.actually_paid === "number" &&
    typeof payload.price_amount === "number" &&
    payload.price_amount > 0
      ? Math.min(Number(wallet.amountUsd), (payload.actually_paid / payload.price_amount) * Number(wallet.amountUsd))
      : Number(wallet.amountUsd),
  );

  const result = await prisma.$transaction(async (tx) => {
    const freshWallet = await tx.cryptoWallet.findUniqueOrThrow({ where: { id: wallet.id } });
    if (freshWallet.status === "confirmed") return null; // race guard under concurrent IPNs

    const transaction = await tx.transaction.findFirst({
      where: { cryptoPaymentId: paymentId, status: "PENDING" },
    });
    if (!transaction) return null;

    // A plan purchase (POST /api/payments/subscribe) is paid for by this IPN —
    // it is NOT also wallet credit. Previously the price was credited to the
    // wallet AND the plan activated, i.e. the plan was effectively free.
    const txMeta = transaction.metadata as Record<string, unknown> | null;
    const planId = typeof txMeta?.planId === "string" ? txMeta.planId : null;
    const isSubscription = transaction.type === "SUBSCRIPTION" || planId !== null;

    if (isSubscription && payload.payment_status === "partially_paid") {
      // Can't activate a plan on a partial payment; leave the row pending —
      // NOWPayments sends another IPN once the remainder arrives.
      await tx.cryptoWallet.update({ where: { id: freshWallet.id }, data: { status: "partially_paid" } });
      return null;
    }

    const user = await tx.user.findUniqueOrThrow({ where: { id: freshWallet.userId } });

    await tx.cryptoWallet.update({
      where: { id: freshWallet.id },
      data: { status: "confirmed", confirmedAt: new Date() },
    });

    if (isSubscription && planId) {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await tx.user.update({
        where: { id: user.id },
        data: { subscriptionPlanId: planId, subscriptionExpiresAt: expiresAt, subscriptionCancelAtPeriodEnd: false },
      });
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: "COMPLETED", balanceAfter: user.walletBalance },
      });
      return { user, amountUsd: creditUsd, transaction, subscription: true };
    }

    const newBalance = round2(Number(user.walletBalance) + creditUsd);
    await tx.transaction.update({
      where: { id: transaction.id },
      data: { status: "COMPLETED", amount: creditUsd, balanceAfter: newBalance },
    });
    await tx.user.update({ where: { id: user.id }, data: { walletBalance: { increment: creditUsd } } });

    return { user, amountUsd: creditUsd, transaction, subscription: false };
  });

  if (result) {
    if (result.subscription) {
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
        formatCurrency(Number(result.user.walletBalance) + result.amountUsd),
        "Crypto",
        result.transaction.id,
        `${appUrl()}/api/wallet/deposit/crypto/${wallet.id}/receipt`,
      );
      // Credited already — a mail failure must not 500 (NOWPayments would retry a no-op).
      await sendEmail({ to: result.user.email, subject, html, slug: "deposit_confirmed" }).catch(() => null);
    }
  }

  return NextResponse.json({ received: true });
}
