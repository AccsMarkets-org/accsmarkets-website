import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withdrawSchema } from "@/lib/validation/wallet";
import { checkRateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";
import { formatCurrency } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { withdrawalRequestedTemplate } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(`wallet-withdraw:${session.user.id}`, 3, 3600);
  if (!allowed) {
    return NextResponse.json({ error: "Too many withdrawal requests. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = withdrawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { amountUsd } = parsed.data;
  const metadata =
    parsed.data.method === "crypto"
      ? { method: "crypto" as const, network: parsed.data.network, address: parsed.data.address }
      : {
          method: "bank" as const,
          bankAccountName: parsed.data.bankAccountName,
          bankAccountNumber: parsed.data.bankAccountNumber,
          bankName: parsed.data.bankName,
          bankRouting: parsed.data.bankRouting,
        };

  const settings = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });
  const minWithdrawal = Number(settings?.minWithdrawal ?? 20);
  if (amountUsd < minWithdrawal) {
    return NextResponse.json({ error: `Minimum withdrawal is $${minWithdrawal}` }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  // Count already-pending withdrawals as reserved so a user can't queue up
  // multiple withdrawals that together exceed their balance.
  const pendingWithdrawals = await prisma.transaction.aggregate({
    where: { userId: user.id, type: "WITHDRAWAL", status: "PENDING" },
    _sum: { amount: true },
  });
  const reserved = Number(pendingWithdrawals._sum.amount ?? 0);
  if (Number(user.walletBalance) - reserved < amountUsd) {
    return NextResponse.json({ error: "Insufficient available balance" }, { status: 400 });
  }

  // Balance is not debited here — only on admin approval (see /api/admin/withdrawals/[id]).
  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      type: "WITHDRAWAL",
      status: "PENDING",
      amount: amountUsd,
      balanceBefore: user.walletBalance,
      balanceAfter: user.walletBalance,
      metadata,
    },
  });

  await createNotification({
    userId: user.id,
    type: "PAYMENT",
    title: "Withdrawal requested",
    body: `Your request for ${formatCurrency(amountUsd)} is pending admin approval.`,
    link: "/dashboard/wallet",
  });

  const destinationMasked = metadata.method === "crypto"
    ? `...${metadata.address.slice(-8)}`
    : `...${metadata.bankAccountNumber.slice(-4)}`;
  if (user.email) {
    const { subject, html } = withdrawalRequestedTemplate(
      user.name ?? "there",
      formatCurrency(amountUsd),
      transaction.id,
      destinationMasked,
      new Date().toLocaleDateString("en-US", { dateStyle: "long" }),
    );
    sendEmail({ to: user.email, subject, html }).catch(() => null);
  }

  return NextResponse.json({ success: true, transactionId: transaction.id });
}
