import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bankTransferDepositSchema } from "@/lib/validation/wallet";
import { calculateDepositFee } from "@/lib/fees";
import { checkRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(
    `bank-deposit:${session.user.id}`,
    RATE_LIMITS.MANUAL_DEPOSITS.limit,
    RATE_LIMITS.MANUAL_DEPOSITS.windowSeconds,
  );
  if (!allowed) return NextResponse.json({ error: "Too many deposit requests. Try again later." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = bankTransferDepositSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { amountUsd, bankAccountId } = parsed.data;

  const [feeConfig, bankAccount] = await Promise.all([
    prisma.depositMethodFee.findUnique({ where: { method: "bank_transfer" } }),
    // Use the account the user selected (if it's active); otherwise the first active one.
    bankAccountId
      ? prisma.platformBankAccount.findFirst({ where: { id: bankAccountId, isActive: true } })
      : prisma.platformBankAccount.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  if (!bankAccount) {
    return NextResponse.json(
      { error: bankAccountId ? "That bank account is no longer available. Please pick another." : "Bank transfer temporarily unavailable." },
      { status: bankAccountId ? 400 : 503 },
    );
  }

  const feeRate = feeConfig ? Number(feeConfig.feeRate) : 0;
  const minFee = feeConfig ? Number(feeConfig.minFee) : 0;
  const maxFee = feeConfig?.maxFee != null ? Number(feeConfig.maxFee) : null;
  const feeUsd = calculateDepositFee(amountUsd, feeRate, minFee, maxFee);
  const totalDue = amountUsd + feeUsd;

  const referenceId = "BT-" + randomBytes(4).toString("hex").toUpperCase();

  const order = await prisma.bankTransferOrder.create({
    data: {
      referenceId,
      userId: session.user.id,
      bankAccountId: bankAccount.id,
      amountUsd,
      feeUsd,
      totalDue,
      status: "PENDING",
    },
  });

  return NextResponse.json({
    orderId: order.id,
    referenceId: order.referenceId,
    totalDue: Number(order.totalDue),
    feeUsd: Number(order.feeUsd),
    bankAccount: {
      bankName: bankAccount.bankName,
      accountName: bankAccount.accountName,
      accountNumber: bankAccount.accountNumber,
      routingNumber: bankAccount.routingNumber,
      swiftCode: bankAccount.swiftCode,
      iban: bankAccount.iban,
      currency: bankAccount.currency,
    },
  });
}
