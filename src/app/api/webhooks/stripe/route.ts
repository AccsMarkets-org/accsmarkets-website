import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { formatCurrency } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const stripe = await getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const rawBody = await req.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const intent: any = event.data.object;
    const userId: string | undefined = intent.metadata?.userId;
    if (!userId) return NextResponse.json({ ok: true });

    const amountUsd = intent.amount / 100;

    const credited = await prisma.$transaction(async (tx) => {
      const fiat = await tx.fiatPayment.findUnique({ where: { providerPaymentId: intent.id } });
      if (!fiat || fiat.status !== "PENDING") return false; // idempotent

      await tx.fiatPayment.update({
        where: { id: fiat.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const newBalance = Number(user.walletBalance) + amountUsd;
      await tx.user.update({ where: { id: userId }, data: { walletBalance: { increment: amountUsd } } });

      await tx.transaction.create({
        data: {
          userId,
          type: "DEPOSIT",
          status: "COMPLETED",
          amount: amountUsd,
          balanceBefore: user.walletBalance,
          balanceAfter: newBalance,
        },
      });
      return true;
    });

    // Only on the first delivery — Stripe retries would otherwise re-notify
    // "deposit successful" for a payment that was credited once already.
    if (credited) {
      await createNotification({
        userId,
        type: "PAYMENT",
        title: "Card deposit successful",
        body: `${formatCurrency(amountUsd)} has been added to your wallet.`,
        link: "/dashboard/wallet",
      }).catch(() => null);
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const intent: any = event.data.object;
    await prisma.fiatPayment.updateMany({
      where: { providerPaymentId: intent.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
  }

  return NextResponse.json({ ok: true });
}
