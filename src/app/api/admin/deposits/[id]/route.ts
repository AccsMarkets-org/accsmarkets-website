import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { createNotification } from "@/lib/notifications";
import { emitToUser } from "@/lib/socket";
import { sendEmail } from "@/lib/email";
import { depositConfirmedTemplate, depositRejectedTemplate } from "@/lib/email-templates";
import { formatCurrency } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["confirm", "reject"]),
  reason: z.string().trim().max(500).optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { allowed } = await checkRateLimit(`admin-finance-action:${session.user.id}`, 60, 300);
  if (!allowed) {
    return NextResponse.json({ error: "Too many actions. Slow down and try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const { action, reason } = parsed.data;

  const wallet = await prisma.cryptoWallet.findUnique({
    where: { id: params.id },
  });
  if (!wallet) return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  if (wallet.status !== "waiting") {
    return NextResponse.json({ error: `Deposit is already ${wallet.status}.` }, { status: 400 });
  }

  if (action === "reject") {
    const updated = await prisma.$transaction(async (tx) => {
      const w = await tx.cryptoWallet.update({
        where: { id: wallet.id },
        data: { status: "rejected" },
      });
      await tx.transaction.updateMany({
        where: {
          userId: wallet.userId,
          type: "DEPOSIT",
          status: "PENDING",
          // Manual deposits have no cryptoPaymentId; match via metadata wallet id.
          metadata: { path: "$.cryptoWalletId", equals: wallet.id },
        },
        data: { status: "FAILED" },
      });
      await auditLog(tx, session.user.id, "deposit.reject", "CryptoWallet", wallet.id, { reason });
      return w;
    });

    await createNotification({
      userId: wallet.userId,
      type: "PAYMENT",
      title: "Deposit rejected",
      body: reason ?? "Your manual deposit could not be verified. Contact support if this is a mistake.",
      link: "/dashboard/wallet",
    });

    const rejectedUser = await prisma.user.findUnique({ where: { id: wallet.userId }, select: { email: true, name: true } });
    if (rejectedUser) {
      const { subject, html } = depositRejectedTemplate(
        rejectedUser.name ?? "there",
        formatCurrency(wallet.amountUsd.toString()),
        `Crypto (${wallet.network})`,
        reason ?? "We couldn't verify this transaction on the blockchain.",
      );
      await sendEmail({ to: rejectedUser.email, subject, html, slug: "deposit_rejected" }).catch(() => null);
    }

    return NextResponse.json({ deposit: updated });
  }

  // confirm — atomic credit, idempotent via the status !== "waiting" guard inside the transaction
  const result = await prisma.$transaction(async (tx) => {
    const fresh = await tx.cryptoWallet.findUniqueOrThrow({ where: { id: wallet.id } });
    if (fresh.status !== "waiting") return null;

    const user = await tx.user.findUniqueOrThrow({ where: { id: wallet.userId } });
    const depositAmount = Number(fresh.amountUsd);
    const newBalance = Number(user.walletBalance) + depositAmount;

    await tx.cryptoWallet.update({
      where: { id: fresh.id },
      data: { status: "confirmed", confirmedAt: new Date() },
    });
    await tx.user.update({ where: { id: user.id }, data: { walletBalance: { increment: depositAmount } } });

    const pendingTx = await tx.transaction.findFirst({
      where: {
        userId: user.id,
        type: "DEPOSIT",
        status: "PENDING",
        metadata: { path: "$.cryptoWalletId", equals: fresh.id },
      },
    });
    if (pendingTx) {
      await tx.transaction.update({
        where: { id: pendingTx.id },
        data: { status: "COMPLETED", balanceAfter: newBalance },
      });
    } else {
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DEPOSIT",
          status: "COMPLETED",
          amount: fresh.amountUsd,
          balanceBefore: user.walletBalance,
          balanceAfter: newBalance,
          metadata: { cryptoWalletId: fresh.id, manual: true },
        },
      });
    }

    await auditLog(tx, session.user.id, "deposit.confirm", "CryptoWallet", fresh.id, {
      amountUsd: Number(fresh.amountUsd),
    });
    return { user, amountUsd: Number(fresh.amountUsd) };
  });

  if (!result) {
    return NextResponse.json({ error: "Deposit was already processed." }, { status: 409 });
  }

  await createNotification({
    userId: result.user.id,
    type: "DEPOSIT_CONFIRMED",
    title: "Deposit confirmed",
    body: `${formatCurrency(result.amountUsd)} has been credited to your wallet.`,
    link: "/dashboard/wallet",
  });
  emitToUser(result.user.id, "deposit_confirmed", { amountUsd: result.amountUsd });
  const { subject, html } = depositConfirmedTemplate(
    result.user.name ?? "there",
    formatCurrency(result.amountUsd),
    formatCurrency(Number(result.user.walletBalance) + result.amountUsd),
    "Crypto",
    params.id,
  );
  await sendEmail({ to: result.user.email, subject, html, slug: "deposit_confirmed" });

  return NextResponse.json({ success: true });
}
