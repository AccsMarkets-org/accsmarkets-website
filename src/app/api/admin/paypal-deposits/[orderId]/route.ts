import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { createNotification } from "@/lib/notifications";
import { emitToUser } from "@/lib/socket";
import { sendEmail } from "@/lib/email";
import { depositConfirmedTemplate } from "@/lib/email-templates";
import { formatCurrency } from "@/lib/utils";
import { adminPaypalActionSchema } from "@/lib/validation/wallet";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: { orderId: string } }) {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { allowed } = await checkRateLimit(`admin-finance-action:${session.user.id}`, 60, 300);
  if (!allowed) {
    return NextResponse.json({ error: "Too many actions. Slow down and try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = adminPaypalActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const { action, amountReceived, reason, adminNotes } = parsed.data;

  const order = await prisma.payPalDepositOrder.findUnique({
    where: { id: params.orderId },
    include: { user: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (action === "reject") {
    if (order.status === "REJECTED" || order.status === "VERIFIED") {
      return NextResponse.json({ error: "Order cannot be rejected in its current state." }, { status: 400 });
    }
    await prisma.$transaction(async (tx) => {
      await tx.payPalDepositOrder.update({
        where: { id: order.id },
        data: { status: "REJECTED", rejectedAt: new Date(), rejectionReason: reason ?? null, adminNotes: adminNotes ?? null },
      });
      await auditLog(tx, session.user.id, "paypal_deposit.reject", "PayPalDepositOrder", order.id, { reason });
    });
    await createNotification({
      userId: order.userId,
      type: "PAYMENT",
      title: "PayPal deposit rejected",
      body: reason ?? "Your PayPal deposit could not be verified. Contact support if this is a mistake.",
      link: `/dashboard/wallet/deposit/paypal/${order.id}`,
    });
    return NextResponse.json({ success: true });
  }

  // verify or partial
  if (order.status !== "SENT") {
    return NextResponse.json(
      { error: `Order must be in SENT status to verify. Current status: ${order.status}.` },
      { status: 400 },
    );
  }

  const creditAmount = action === "partial" && amountReceived !== undefined
    ? amountReceived
    : Number(order.amountUsd);

  const result = await prisma.$transaction(async (tx) => {
    const fresh = await tx.payPalDepositOrder.findUniqueOrThrow({ where: { id: order.id } });
    if (fresh.status === "VERIFIED") return null;

    const user = await tx.user.findUniqueOrThrow({ where: { id: order.userId } });
    const balanceBefore = Number(user.walletBalance);
    const balanceAfter = balanceBefore + creditAmount;

    await tx.user.update({ where: { id: user.id }, data: { walletBalance: { increment: creditAmount } } });
    await tx.payPalDepositOrder.update({
      where: { id: order.id },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
        amountReceived: amountReceived ?? Number(order.amountUsd),
        adminNotes: adminNotes ?? null,
      },
    });

    await tx.transaction.create({
      data: {
        userId: user.id,
        type: "DEPOSIT",
        status: "COMPLETED",
        amount: creditAmount,
        balanceBefore,
        balanceAfter,
        metadata: { method: "paypal", orderId: order.id, referenceId: order.referenceId },
      },
    });

    await auditLog(tx, session.user.id, "paypal_deposit.verify", "PayPalDepositOrder", order.id, {
      amountUsd: Number(order.amountUsd),
      creditAmount,
      action,
    });

    return { user, creditAmount };
  });

  if (!result) {
    return NextResponse.json({ error: "Order was already verified." }, { status: 409 });
  }

  await createNotification({
    userId: result.user.id,
    type: "DEPOSIT_CONFIRMED",
    title: "PayPal deposit confirmed",
    body: `${formatCurrency(result.creditAmount)} has been credited to your wallet.`,
    link: `/dashboard/wallet/deposit/paypal/${order.id}`,
  });
  emitToUser(result.user.id, "deposit_confirmed", { amountUsd: result.creditAmount });
  const { subject, html } = depositConfirmedTemplate(
    result.user.name ?? "there",
    formatCurrency(result.creditAmount),
    formatCurrency(Number(result.user.walletBalance) + result.creditAmount),
    "PayPal",
    order.id,
  );
  await sendEmail({ to: result.user.email, subject, html, slug: "deposit_confirmed" });

  return NextResponse.json({ success: true });
}
