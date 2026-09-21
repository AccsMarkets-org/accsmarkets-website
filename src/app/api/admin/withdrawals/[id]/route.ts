import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { createNotification } from "@/lib/notifications";
import { formatCurrency } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { withdrawalCompletedTemplate } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
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

  const withdrawal = await prisma.transaction.findUnique({
    where: { id: params.id },
  });
  if (!withdrawal || withdrawal.type !== "WITHDRAWAL") {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
  }
  if (withdrawal.status !== "PENDING") {
    return NextResponse.json({ error: `Withdrawal is already ${withdrawal.status.toLowerCase()}.` }, { status: 400 });
  }

  if (action === "reject") {
    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({ where: { id: withdrawal.id }, data: { status: "CANCELLED" } });
      await auditLog(tx, session.user.id, "withdrawal.reject", "Transaction", withdrawal.id, { reason });
    });

    await createNotification({
      userId: withdrawal.userId,
      type: "PAYMENT",
      title: "Withdrawal rejected",
      body: reason ?? "Your withdrawal request was rejected. Funds remain in your wallet.",
      link: "/dashboard/wallet",
    });
    return NextResponse.json({ success: true });
  }

  // approve — debit the balance now (it was only reserved before)
  const result = await prisma.$transaction(async (tx) => {
    const fresh = await tx.transaction.findUniqueOrThrow({ where: { id: withdrawal.id } });
    if (fresh.status !== "PENDING") return null;

    const user = await tx.user.findUniqueOrThrow({ where: { id: withdrawal.userId } });
    const amount = Number(withdrawal.amount);
    if (Number(user.walletBalance) < amount) throw new Error("INSUFFICIENT");

    const newBalance = Number(user.walletBalance) - amount;
    // Atomic guarded debit — see src/app/api/escrows/route.ts for why a plain
    // read-then-write here is unsafe under concurrent approvals.
    const debited = await tx.user.updateMany({
      where: { id: user.id, walletBalance: { gte: amount } },
      data: { walletBalance: { decrement: amount } },
    });
    if (debited.count === 0) throw new Error("INSUFFICIENT");
    await tx.transaction.update({
      where: { id: withdrawal.id },
      data: { status: "COMPLETED", balanceBefore: user.walletBalance, balanceAfter: newBalance },
    });
    await auditLog(tx, session.user.id, "withdrawal.approve", "Transaction", withdrawal.id, { amount });
    return { amount };
  }).catch((err) => {
    if (err instanceof Error && err.message === "INSUFFICIENT") return "insufficient" as const;
    throw err;
  });

  if (result === null) {
    return NextResponse.json({ error: "Withdrawal was already processed." }, { status: 409 });
  }
  if (result === "insufficient") {
    return NextResponse.json(
      { error: "User no longer has sufficient balance. Reject the request instead." },
      { status: 400 },
    );
  }

  const withdrawalMeta = withdrawal.metadata as {
    method?: string;
    address?: string;
    bankAccountNumber?: string;
  } | null;
  await createNotification({
    userId: withdrawal.userId,
    type: "PAYMENT",
    title: "Withdrawal approved",
    body:
      withdrawalMeta?.method === "bank"
        ? `${formatCurrency(result.amount)} is being sent to your bank account.`
        : `${formatCurrency(result.amount)} is being sent to your wallet address.`,
    link: "/dashboard/wallet",
  });

  const recipient = await prisma.user.findUnique({
    where: { id: withdrawal.userId },
    select: { name: true, email: true },
  });
  if (recipient?.email) {
    const destinationMasked =
      withdrawalMeta?.method === "bank"
        ? `Bank account ...${(withdrawalMeta.bankAccountNumber ?? "").slice(-4)}`
        : `Crypto wallet ...${(withdrawalMeta?.address ?? "").slice(-8)}`;
    const { subject, html } = withdrawalCompletedTemplate(
      recipient.name ?? "there",
      formatCurrency(result.amount),
      withdrawal.id,
      destinationMasked,
      new Date().toLocaleDateString("en-US", { dateStyle: "long" }),
    );
    sendEmail({ to: recipient.email, subject, html }).catch(() => null);
  }

  return NextResponse.json({ success: true });
}
