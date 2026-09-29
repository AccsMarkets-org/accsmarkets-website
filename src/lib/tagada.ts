/**
 * Lightweight TagadaPay singleton, mirroring the graceful-degradation pattern
 * in src/lib/stripe.ts: getTagada() resolves to null when TAGADA_API_KEY is
 * not set, so the card deposit tab / "pay the difference" checkout flow can
 * stay hidden without crashing the rest of the app.
 *
 * Unlike stripe.ts (which leans on a `new Function('m','return require(m)')`
 * eval hack because the `stripe` package was never actually installed here),
 * `@tagadapay/node-sdk` IS a real installed dependency. This uses a plain
 * dynamic import() instead of the eval hack, gated behind the env-var check
 * below — the module is only ever loaded (and `new Tagada(...)` only ever
 * constructed) once TAGADA_API_KEY is present, so an unconfigured deployment
 * never pays for it and never crashes at module-load time.
 *
 * Env vars (see .env.example):
 *   TAGADA_API_KEY          Processing Key — "tp_sk_live_..." or "tp_sk_test_..."
 *   TAGADA_STORE_ID         Store to charge/credit against
 *   TAGADA_WEBHOOK_SECRET   Verifies inbound `POST /api/webhooks/tagada` signatures
 *   NEXT_PUBLIC_TAGADA_ENABLED     "true" to show the Card (TagadaPay) tab client-side
 *   NEXT_PUBLIC_TAGADA_TEST_MODE   "true" to show a "TEST MODE" badge on that tab
 */
import type Tagada from "@tagadapay/node-sdk";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { depositConfirmedTemplate } from "@/lib/email-templates";
import { appUrl } from "@/lib/email-render";
import { formatCurrency, round2 } from "@/lib/utils";

let _tagada: Tagada | null = null;
let _tried = false;

export async function getTagada(): Promise<Tagada | null> {
  if (_tried) return _tagada;
  _tried = true;

  const key = process.env.TAGADA_API_KEY;
  if (!key) return null;

  try {
    const { default: TagadaSDK } = await import("@tagadapay/node-sdk");
    _tagada = new TagadaSDK(key);
  } catch {
    _tagada = null;
  }
  return _tagada;
}

/** True when TAGADA_API_KEY is a test-mode Processing Key ("tp_sk_test_..."). */
export function isTagadaTestMode(): boolean {
  return Boolean(process.env.TAGADA_API_KEY?.startsWith("tp_sk_test_"));
}

/**
 * Credits a wallet for a successful TagadaPay charge -- the one place this
 * happens, shared by the deposit route's own success path and the admin
 * reconcile endpoint (POST /api/admin/deposits/tagada/[fiatPaymentId]/reconcile)
 * that re-checks a payment TagadaPay says succeeded but that got marked
 * FAILED here (the exact bug fixed by recognizing payment.status ===
 * "succeeded" -- this helper exists so that class of bug can be fixed for a
 * past payment via one shared, correct code path instead of hand-editing the
 * database). Idempotent: a FiatPayment that isn't still PENDING is a no-op.
 */
export async function creditTagadaFiatPayment(params: {
  fiatPaymentId: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  amountUsd: number;
  tagadaPaymentId: string;
}): Promise<{ credited: boolean; newBalance?: number }> {
  const { fiatPaymentId, userId, userEmail, userName, amountUsd, tagadaPaymentId } = params;

  const credited = await prisma.$transaction(async (tx) => {
    const fresh = await tx.fiatPayment.findUniqueOrThrow({ where: { id: fiatPaymentId } });
    // PENDING: the normal path. FAILED: reconciling a payment TagadaPay says
    // succeeded but that got marked failed here (see the admin reconcile
    // endpoint). COMPLETED: already credited, must not run twice.
    if (fresh.status !== "PENDING" && fresh.status !== "FAILED") return null;

    await tx.fiatPayment.update({
      where: { id: fresh.id },
      data: { status: "COMPLETED", providerPaymentId: tagadaPaymentId, completedAt: new Date() },
    });

    const freshUser = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const newBalance = round2(Number(freshUser.walletBalance) + amountUsd);

    await tx.user.update({ where: { id: userId }, data: { walletBalance: { increment: amountUsd } } });
    await tx.transaction.create({
      data: {
        userId,
        type: "DEPOSIT",
        status: "COMPLETED",
        amount: amountUsd,
        balanceBefore: freshUser.walletBalance,
        balanceAfter: newBalance,
        metadata: { provider: "tagadapay", paymentId: tagadaPaymentId },
      },
    });

    return { newBalance };
  });

  if (!credited) return { credited: false };

  await createNotification({
    userId,
    type: "PAYMENT",
    title: "Card deposit successful",
    body: `${formatCurrency(amountUsd)} has been added to your wallet.`,
    link: "/dashboard/wallet",
  }).catch(() => null);

  const { subject, html } = depositConfirmedTemplate(
    userName ?? "there",
    formatCurrency(amountUsd),
    formatCurrency(credited.newBalance),
    "Card (TagadaPay)",
    tagadaPaymentId,
    `${appUrl()}/api/wallet/deposit/tagada/${fiatPaymentId}/receipt`,
  );
  await sendEmail({ to: userEmail, subject, html, slug: "deposit_confirmed" }).catch(() => null);

  return { credited: true, newBalance: credited.newBalance };
}
