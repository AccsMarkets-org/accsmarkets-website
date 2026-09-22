import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withdrawSchema } from "@/lib/validation/wallet";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";
import { formatCurrency } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { withdrawalRequestedTemplate } from "@/lib/email-templates";
import { notifyAdminHighRisk, upsertRiskScore } from "@/lib/risk";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "singleton" },
    select: { minWithdrawal: true },
  });
  return NextResponse.json({ minWithdrawal: Number(settings?.minWithdrawal ?? 20) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(`wallet-withdraw:${session.user.id}`, 3, 3600);
  if (!allowed) {
    return NextResponse.json({ error: "Too many withdrawal requests. Try again later." }, { status: 429 });
  }

  // Gate at PHONE level — same requirement as creating a listing. Read from the
  // DB rather than the session JWT, which can carry a stale kycLevel.
  const kycUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { kycLevel: true },
  });
  if (!kycUser || kycUser.kycLevel === "NONE" || kycUser.kycLevel === "EMAIL") {
    return NextResponse.json(
      {
        error: "Verify your phone number before withdrawing. Go to Settings → Verification.",
        link: "/dashboard/settings/verification",
      },
      { status: 403 },
    );
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

  // Risk gate: recompute now (a withdrawal is exactly when a fresh score
  // matters), fall back to the stored score if the recompute failed. HIGH /
  // CRITICAL never blocks the request — it's created as usual but flagged with
  // metadata.riskHold so admins see it needs a closer look before approving.
  const fresh = await upsertRiskScore(user.id);
  const severity =
    fresh?.severity ??
    (await prisma.riskScore.findUnique({ where: { userId: user.id }, select: { severity: true } }))?.severity ??
    "LOW";
  const riskHold = severity === "HIGH" || severity === "CRITICAL";

  // Balance is not debited here — only on admin approval (see /api/admin/withdrawals/[id]).
  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      type: "WITHDRAWAL",
      status: "PENDING",
      amount: amountUsd,
      balanceBefore: user.walletBalance,
      balanceAfter: user.walletBalance,
      metadata: riskHold ? { ...metadata, riskHold: true, riskLevel: severity } : metadata,
    },
  });

  if (riskHold) {
    const openFlag = await prisma.securityFlag.findFirst({
      where: { userId: user.id, resolvedAt: null },
      select: { id: true },
    });
    const flag =
      openFlag ??
      (await prisma.securityFlag.create({
        data: {
          userId: user.id,
          source: "withdrawal_hold",
          severity,
          reason: `Withdrawal of ${formatCurrency(amountUsd)} requested while risk severity is ${severity} (tx ${transaction.id}).`,
        },
        select: { id: true },
      }));
    notifyAdminHighRisk({
      userId: user.id,
      flagId: flag.id,
      triggeredRule: `Withdrawal request under ${severity} risk`,
      score: fresh?.score ?? 0,
      transactionId: transaction.id,
      ip: getClientIp(req.headers),
    });
  }

  await createNotification({
    userId: user.id,
    type: "PAYMENT",
    title: riskHold ? "Withdrawal under review" : "Withdrawal requested",
    body: riskHold
      ? `Your withdrawal of ${formatCurrency(amountUsd)} is under additional review. We'll notify you once it's processed.`
      : `Your request for ${formatCurrency(amountUsd)} is pending admin approval.`,
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

  return NextResponse.json({
    success: true,
    transactionId: transaction.id,
    riskHold,
    ...(riskHold ? { message: "Your withdrawal is under additional review." } : {}),
  });
}
