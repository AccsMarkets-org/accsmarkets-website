import { NextResponse } from "next/server";
import { getTagada } from "@/lib/tagada";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { depositConfirmedTemplate, depositFailedTemplate } from "@/lib/email-templates";
import { formatCurrency, round2 } from "@/lib/utils";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const SUCCESS_EVENTS = new Set(["payment/succeeded"]);
const FAILURE_EVENTS = new Set(["payment/failed", "payment/rejected"]);

interface TagadaPaymentLike {
  id: string;
  status?: string;
}

// The SDK's `constructEvent` returns `JSON.parse(rawBody)` typed as `unknown`
// (its .d.ts has no published event-payload shape). Event delivery follows
// the "Stripe-style ergonomics" the SDK's own docstring describes, so the
// payment resource is expected at `event.data.object` — with a couple of
// defensive fallbacks in case a given event nests it differently.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPayment(event: any): TagadaPaymentLike | null {
  const candidate = event?.data?.object ?? event?.data ?? event?.payment ?? null;
  if (candidate && typeof candidate === "object" && typeof candidate.id === "string") {
    return candidate as TagadaPaymentLike;
  }
  return null;
}

export async function POST(req: Request) {
  // Fail closed: without the secret, the signature can't be verified, so
  // nothing is processed — same convention as the WhatsApp webhook.
  const secret = process.env.TAGADA_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const tagada = await getTagada();
  if (!tagada) return NextResponse.json({ error: "TagadaPay not configured" }, { status: 503 });

  try {
    return await handleWebhook(req, tagada, secret);
  } catch (err) {
    logger.error("tagada.webhook.unhandled", { err: String(err) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function handleWebhook(
  req: Request,
  tagada: NonNullable<Awaited<ReturnType<typeof getTagada>>>,
  secret: string,
): Promise<NextResponse> {
  const rawBody = await req.text();
  const signature = req.headers.get("x-tagadapay-signature");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = tagada.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const eventType = typeof event?.type === "string" ? event.type : "";

  if (SUCCESS_EVENTS.has(eventType)) {
    const payment = extractPayment(event);
    if (!payment) return NextResponse.json({ received: true });

    const credited = await prisma.$transaction(async (tx) => {
      const fiat = await tx.fiatPayment.findUnique({ where: { providerPaymentId: payment.id } });
      // Idempotency guard, matching the NOWPayments/Stripe webhook convention:
      // only credit once. A retried delivery (or a race with the synchronous
      // POST /api/wallet/deposit/tagada response) for the same payment id is
      // a no-op once it's already COMPLETED.
      if (!fiat || fiat.status !== "PENDING") return null;

      const user = await tx.user.findUniqueOrThrow({ where: { id: fiat.userId } });
      const amountUsd = round2(Number(fiat.amountUsd));
      const newBalance = round2(Number(user.walletBalance) + amountUsd);

      await tx.fiatPayment.update({
        where: { id: fiat.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      await tx.user.update({ where: { id: user.id }, data: { walletBalance: { increment: amountUsd } } });
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DEPOSIT",
          status: "COMPLETED",
          amount: amountUsd,
          balanceBefore: user.walletBalance,
          balanceAfter: newBalance,
          metadata: { provider: "tagadapay", paymentId: payment.id },
        },
      });

      return { user, amountUsd, newBalance };
    });

    if (credited) {
      await createNotification({
        userId: credited.user.id,
        type: "PAYMENT",
        title: "Card deposit successful",
        body: `${formatCurrency(credited.amountUsd)} has been added to your wallet.`,
        link: "/dashboard/wallet",
      }).catch(() => null);

      const { subject, html } = depositConfirmedTemplate(
        credited.user.name ?? "there",
        formatCurrency(credited.amountUsd),
        formatCurrency(credited.newBalance),
        "Card (TagadaPay)",
        payment.id,
      );
      await sendEmail({ to: credited.user.email, subject, html, slug: "deposit_confirmed" }).catch(() => null);
    }

    return NextResponse.json({ received: true });
  }

  if (FAILURE_EVENTS.has(eventType)) {
    const payment = extractPayment(event);
    if (payment) {
      // findUnique + conditional update (not updateMany) because notifying the
      // user requires the row's userId -- updateMany reports a count, never
      // which record it touched, so a webhook-only failure would otherwise
      // never reach the user at all (only a synchronous-response failure did).
      const fiat = await prisma.fiatPayment.findUnique({ where: { providerPaymentId: payment.id } });
      if (fiat && fiat.status === "PENDING") {
        await prisma.fiatPayment.update({ where: { id: fiat.id }, data: { status: "FAILED" } });
        const user = await prisma.user.findUnique({ where: { id: fiat.userId } });
        if (user) {
          const amountUsd = round2(Number(fiat.amountUsd));
          await createNotification({
            userId: user.id,
            type: "PAYMENT",
            title: "Card deposit failed",
            body: `We couldn't charge your card for ${formatCurrency(amountUsd)}. ${eventType === "payment/rejected" ? "The payment was rejected." : "The charge failed."}`,
            link: "/dashboard/wallet",
          }).catch(() => null);
          const { subject, html } = depositFailedTemplate(
            user.name ?? "there",
            formatCurrency(amountUsd),
            "Card (TagadaPay)",
            eventType === "payment/rejected" ? "Payment was rejected" : "Charge failed",
          );
          await sendEmail({ to: user.email, subject, html, slug: "deposit_failed" }).catch(() => null);
        }
      }
    }
    return NextResponse.json({ received: true });
  }

  // Ignore everything else (payment/created, payment/authorized, order/paid, ...).
  return NextResponse.json({ received: true });
}
