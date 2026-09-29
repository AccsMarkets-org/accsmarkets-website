import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paypalDepositSchema } from "@/lib/validation/wallet";
import { calculateDepositFee } from "@/lib/fees";
import { checkRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import { randomBytes } from "crypto";
import { sendEmail } from "@/lib/email";
import { depositSubmittedTemplate } from "@/lib/email-templates";
import { appUrl } from "@/lib/email-render";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(
    `paypal-deposit:${session.user.id}`,
    RATE_LIMITS.MANUAL_DEPOSITS.limit,
    RATE_LIMITS.MANUAL_DEPOSITS.windowSeconds,
  );
  if (!allowed) return NextResponse.json({ error: "Too many deposit requests. Try again later." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = paypalDepositSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { amountUsd, paypalAccountId } = parsed.data;

  const [feeConfig, paypalAccount] = await Promise.all([
    prisma.depositMethodFee.findUnique({ where: { method: "paypal" } }),
    // Use the account the user selected (if it's active); otherwise the first active one.
    paypalAccountId
      ? prisma.platformPayPalAccount.findFirst({ where: { id: paypalAccountId, isActive: true } })
      : prisma.platformPayPalAccount.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  if (!paypalAccount) {
    return NextResponse.json(
      { error: paypalAccountId ? "That PayPal account is no longer available. Please pick another." : "PayPal transfer temporarily unavailable." },
      { status: paypalAccountId ? 400 : 503 },
    );
  }

  const feeRate = feeConfig ? Number(feeConfig.feeRate) : 0;
  const minFee = feeConfig ? Number(feeConfig.minFee) : 0;
  const maxFee = feeConfig?.maxFee != null ? Number(feeConfig.maxFee) : null;
  const feeUsd = calculateDepositFee(amountUsd, feeRate, minFee, maxFee);
  const totalDue = amountUsd + feeUsd;

  const referenceId = "PP-" + randomBytes(4).toString("hex").toUpperCase();

  const order = await prisma.payPalDepositOrder.create({
    data: {
      referenceId,
      userId: session.user.id,
      paypalAccountId: paypalAccount.id,
      amountUsd,
      feeUsd,
      totalDue,
      status: "PENDING",
    },
  });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, name: true } });
  if (user) {
    const { subject, html } = depositSubmittedTemplate(
      user.name ?? "there",
      formatCurrency(totalDue),
      "PayPal",
      `Send ${formatCurrency(totalDue)} to ${paypalAccount.paypalEmail} as Friends & Family using the reference below, then mark it as sent from your dashboard.`,
      referenceId,
      `${appUrl()}/dashboard/wallet/deposit/paypal/${order.id}`,
    );
    await sendEmail({ to: user.email, subject, html, slug: "deposit_submitted" }).catch(() => null);
  }

  return NextResponse.json({
    orderId: order.id,
    referenceId: order.referenceId,
    totalDue: Number(order.totalDue),
    feeUsd: Number(order.feeUsd),
    paypalAccount: {
      label: paypalAccount.label,
      paypalEmail: paypalAccount.paypalEmail,
      instructions: paypalAccount.instructions,
      currency: paypalAccount.currency,
    },
  });
}
