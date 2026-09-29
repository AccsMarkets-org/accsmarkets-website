import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { getTagada, creditTagadaFiatPayment } from "@/lib/tagada";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Re-checks a card deposit against TagadaPay's own record of it. Exists
 * because of a real bug: TagadaPay returns payment.status === "succeeded"
 * for a completed charge, which wasn't recognized as success here, so a
 * real charge could be marked FAILED in our DB while the card was actually
 * charged. This asks TagadaPay directly "what really happened to this
 * payment" and corrects our side (crediting the wallet) only if TagadaPay
 * confirms it actually succeeded -- it never charges anything itself.
 */
export async function PUT(_req: Request, { params }: { params: { fiatPaymentId: string } }) {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { allowed } = await checkRateLimit(`admin-finance-action:${session.user.id}`, 60, 300);
  if (!allowed) {
    return NextResponse.json({ error: "Too many actions. Slow down and try again shortly." }, { status: 429 });
  }

  const fiatPayment = await prisma.fiatPayment.findUnique({
    where: { id: params.fiatPaymentId },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  if (!fiatPayment || fiatPayment.provider !== "tagadapay") {
    return NextResponse.json({ error: "Card deposit not found" }, { status: 404 });
  }
  if (fiatPayment.status === "COMPLETED") {
    return NextResponse.json({ error: "Already completed — nothing to reconcile." }, { status: 400 });
  }
  if (fiatPayment.providerPaymentId.startsWith("pending_")) {
    return NextResponse.json(
      { error: "No TagadaPay payment was ever created for this attempt (it failed before reaching TagadaPay) — there is nothing to look up." },
      { status: 400 },
    );
  }

  const tagada = await getTagada();
  if (!tagada) return NextResponse.json({ error: "Card payments are not configured" }, { status: 503 });

  let realStatus: string;
  try {
    const payment = await tagada.payments.retrieve(fiatPayment.providerPaymentId);
    realStatus = payment.status;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not look up this payment at TagadaPay" },
      { status: 502 },
    );
  }

  const isSuccess = realStatus === "captured" || realStatus === "authorized" || realStatus === "succeeded";
  if (!isSuccess) {
    return NextResponse.json({
      error: `TagadaPay confirms this payment did not succeed (status: ${realStatus}). Nothing to credit — the FAILED status here is correct.`,
    }, { status: 400 });
  }

  const result = await creditTagadaFiatPayment({
    fiatPaymentId: fiatPayment.id,
    userId: fiatPayment.user.id,
    userEmail: fiatPayment.user.email,
    userName: fiatPayment.user.name,
    amountUsd: Number(fiatPayment.amountUsd),
    tagadaPaymentId: fiatPayment.providerPaymentId,
  });

  if (!result.credited) {
    return NextResponse.json({ error: "Already credited (a concurrent request or webhook got there first)." }, { status: 409 });
  }

  await auditLog(prisma, session.user.id, "card_deposit.reconcile", "FiatPayment", fiatPayment.id, {
    realStatus, amountUsd: Number(fiatPayment.amountUsd), newBalance: result.newBalance,
  });

  return NextResponse.json({ success: true, newBalance: result.newBalance });
}
