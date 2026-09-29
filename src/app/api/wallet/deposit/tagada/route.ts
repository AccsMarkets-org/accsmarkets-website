import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTagada } from "@/lib/tagada";
import { TagadaAPIError, type Payment, type PaymentInstrument } from "@tagadapay/node-sdk";
import { prisma } from "@/lib/db";
import { tagadaDepositSchema } from "@/lib/validation/wallet";
import { checkRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { depositConfirmedTemplate } from "@/lib/email-templates";
import { formatCurrency, round2 } from "@/lib/utils";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// TagadaAPIError.raw carries the underlying processor's own error payload
// (decline code, gateway message, etc.) -- without this, a real card's
// rejection is a dead end: the SDK's own message is often just "Card charge
// failed" with the actual reason nowhere the server ever looks.
function describeTagadaError(err: unknown): Record<string, unknown> {
  if (err instanceof TagadaAPIError) {
    return {
      errorMessage: err.message,
      code: err.code,
      statusCode: err.statusCode,
      requestId: err.requestId,
      param: err.param,
      raw: err.raw,
    };
  }
  return { errorMessage: err instanceof Error ? err.message : String(err) };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Everything below can hit the database or the TagadaPay API. Without this
  // outer guard, an unexpected throw (a transient DB error, anything not
  // covered by the two inner try/catches below) escapes as Next.js's default
  // HTML error page instead of JSON -- the client's `res.json()` then fails
  // with "Unexpected token '<'", which is indistinguishable from the request
  // never reaching the server at all (nothing here is logged otherwise).
  try {
    return await handleDeposit(req, session.user.id);
  } catch (err) {
    logger.error("tagada.deposit.unhandled", { userId: session.user.id, err: String(err) });
    return NextResponse.json({ error: "Something went wrong processing your deposit. Please try again." }, { status: 500 });
  }
}

async function handleDeposit(req: Request, sessionUserId: string): Promise<NextResponse> {
  const tagada = await getTagada();
  if (!tagada) return NextResponse.json({ error: "Card payments are not configured" }, { status: 503 });

  const storeId = process.env.TAGADA_STORE_ID;
  if (!storeId) return NextResponse.json({ error: "Card payments are not configured" }, { status: 503 });

  const { allowed } = await checkRateLimit(
    `tagada-deposit:${sessionUserId}`,
    RATE_LIMITS.MANUAL_DEPOSITS.limit,
    RATE_LIMITS.MANUAL_DEPOSITS.windowSeconds,
  );
  if (!allowed) return NextResponse.json({ error: "Too many deposit requests. Try again later." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = tagadaDepositSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { amountUsd, tagadaToken } = parsed.data;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUserId } });

  // Prefer the client's key so it stays stable across that submission's own
  // automatic retries (see TagadaCardForm) -- a request that dies in transit
  // after we've already charged the card must retry into the SAME attempt,
  // not mint a fresh one, or a second real charge becomes possible. Falls
  // back to a server-generated key for an older cached client bundle that
  // never sent one.
  const idempotencyKey = parsed.data.idempotencyKey ?? randomUUID();

  if (parsed.data.idempotencyKey) {
    const existing = await prisma.fiatPayment.findUnique({ where: { clientIdempotencyKey: idempotencyKey } });
    if (existing) {
      // Replay of a submission we've already seen -- never re-tokenize or
      // re-charge, just report where that attempt currently stands.
      if (existing.status === "COMPLETED") {
        return NextResponse.json({ status: "completed", paymentId: existing.providerPaymentId });
      }
      if (existing.status === "FAILED") {
        return NextResponse.json({ error: "Card charge failed. Please try another card." }, { status: 402 });
      }
      // Still PENDING: the original attempt is (or was) genuinely in flight.
      // Report pending rather than starting a second charge attempt for it.
      return NextResponse.json({ status: "pending", paymentId: existing.providerPaymentId });
    }
  }

  // A single-use idempotency key generated up front, not the FiatPayment row's
  // own `id` — that field isn't known to have the real TagadaPay payment id
  // until after payments.process() responds, and providerPaymentId is a
  // required unique column. The row is created below with a placeholder
  // ("pending_<key>") that's swapped for the real payment id once known, and
  // the same key is passed to payments.process() so a client retry (e.g. a
  // dropped connection) can never double-charge the card.
  const fiatPayment = await prisma.fiatPayment.create({
    data: {
      userId: user.id,
      provider: "tagadapay",
      providerPaymentId: `pending_${idempotencyKey}`,
      clientIdempotencyKey: idempotencyKey,
      amountUsd,
      currency: "usd",
      status: "PENDING",
    },
  });

  let instrument: PaymentInstrument;
  try {
    const result = await tagada.paymentInstruments.createFromToken({
      tagadaToken,
      storeId,
      customerData: { email: user.email, firstName: user.name ?? undefined },
    });
    instrument = result.paymentInstrument;
  } catch (err) {
    await prisma.fiatPayment.update({ where: { id: fiatPayment.id }, data: { status: "FAILED" } }).catch(() => null);
    logger.error("tagada.deposit.instrument_failed", {
      userId: user.id, fiatPaymentId: fiatPayment.id, idempotencyKey, ...describeTagadaError(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not verify card" },
      { status: 400 },
    );
  }

  let payment: Payment;
  try {
    const result = await tagada.payments.process(
      {
        paymentInstrumentId: instrument.id,
        amount: Math.round(amountUsd * 100),
        currency: "USD",
        storeId,
        initiatedBy: user.id,
      },
      { idempotencyKey },
    );
    payment = result.payment;
  } catch (err) {
    await prisma.fiatPayment.update({ where: { id: fiatPayment.id }, data: { status: "FAILED" } }).catch(() => null);
    logger.error("tagada.deposit.charge_failed", {
      userId: user.id, fiatPaymentId: fiatPayment.id, idempotencyKey, ...describeTagadaError(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Card charge failed" },
      { status: 502 },
    );
  }

  // TODO: 3DS continuation — if a processor returns a client-side "requires
  // action" step (Radar fingerprint / 3DS challenge), `payment` carries a
  // `requireAction` field alongside status "pending" per the SDK's README,
  // but the exact shape isn't in the published .d.ts. That flow needs a
  // browser round-trip via @tagadapay/core-js's ThreedsManager/PaymentsClient
  // (see tagada.payments.continue()) and isn't implemented here — the happy
  // path (no additional action required) is what's handled below.

  if (payment.status === "captured" || payment.status === "authorized") {
    const credited = await prisma.$transaction(async (tx) => {
      const fresh = await tx.fiatPayment.findUniqueOrThrow({ where: { id: fiatPayment.id } });
      if (fresh.status !== "PENDING") return null; // idempotency guard against a racing webhook delivery

      await tx.fiatPayment.update({
        where: { id: fresh.id },
        data: { status: "COMPLETED", providerPaymentId: payment.id, completedAt: new Date() },
      });

      const freshUser = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      const newBalance = round2(Number(freshUser.walletBalance) + amountUsd);

      await tx.user.update({ where: { id: user.id }, data: { walletBalance: { increment: amountUsd } } });
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DEPOSIT",
          status: "COMPLETED",
          amount: amountUsd,
          balanceBefore: freshUser.walletBalance,
          balanceAfter: newBalance,
          metadata: { provider: "tagadapay", paymentId: payment.id },
        },
      });

      return { newBalance };
    });

    if (credited) {
      await createNotification({
        userId: user.id,
        type: "PAYMENT",
        title: "Card deposit successful",
        body: `${formatCurrency(amountUsd)} has been added to your wallet.`,
        link: "/dashboard/wallet",
      }).catch(() => null);

      const { subject, html } = depositConfirmedTemplate(
        user.name ?? "there",
        formatCurrency(amountUsd),
        formatCurrency(credited.newBalance),
        "Card (TagadaPay)",
        payment.id,
      );
      await sendEmail({ to: user.email, subject, html, slug: "deposit_confirmed" }).catch(() => null);
    }

    return NextResponse.json({ status: "completed", paymentId: payment.id });
  }

  if (payment.status === "pending") {
    await prisma.fiatPayment.update({
      where: { id: fiatPayment.id },
      data: { providerPaymentId: payment.id },
    });
    return NextResponse.json({ status: "pending", paymentId: payment.id });
  }

  // declined | error | cancelled
  await prisma.fiatPayment.update({
    where: { id: fiatPayment.id },
    data: { status: "FAILED", providerPaymentId: payment.id },
  });
  logger.error("tagada.deposit.declined", {
    userId: user.id, fiatPaymentId: fiatPayment.id, paymentId: payment.id, paymentStatus: payment.status,
    // The full object may carry a decline/failure reason field the .d.ts
    // doesn't declare (per the SDK's own README caveat noted below) --
    // logging it whole here beats guessing at a property name.
    payment,
  });
  return NextResponse.json(
    { error: `Card charge ${payment.status === "declined" ? "was declined" : "failed"}. Please try another card.` },
    { status: 402 },
  );
}
