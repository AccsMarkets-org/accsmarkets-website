import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { manualDepositSchema } from "@/lib/validation/wallet";
import { checkRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { depositSubmittedTemplate } from "@/lib/email-templates";
import { appUrl } from "@/lib/email-render";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(
    `manual-deposit:${session.user.id}`,
    RATE_LIMITS.MANUAL_DEPOSITS.limit,
    RATE_LIMITS.MANUAL_DEPOSITS.windowSeconds,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Too many deposit requests. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = manualDepositSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { amountUsd, network, txHash, proofImageUrl } = parsed.data;

  const wallet = await prisma.cryptoWallet.create({
    data: {
      userId: session.user.id,
      network,
      currency: network,
      amountUsd,
      isManual: true,
      txHash,
      proofImageUrl,
      status: "waiting",
    },
  });

  const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  await prisma.transaction.create({
    data: {
      userId: session.user.id,
      type: "DEPOSIT",
      status: "PENDING",
      amount: amountUsd,
      balanceBefore: currentUser.walletBalance,
      balanceAfter: currentUser.walletBalance,
      metadata: { cryptoWalletId: wallet.id, network, manual: true },
    },
  });

  await createNotification({
    userId: session.user.id,
    type: "PAYMENT",
    title: "Deposit submitted",
    body: `Your ${network} deposit is awaiting admin verification.`,
    link: "/dashboard/wallet",
  }).catch(() => null);

  const { subject, html } = depositSubmittedTemplate(
    currentUser.name ?? "there",
    formatCurrency(amountUsd),
    `Crypto (${network})`,
    "An admin will review your transaction hash and credit your wallet once verified, usually within 1–24 hours.",
    wallet.id,
    `${appUrl()}/dashboard/wallet`,
  );
  await sendEmail({ to: currentUser.email, subject, html, slug: "deposit_submitted" }).catch(() => null);

  return NextResponse.json({ success: true, walletId: wallet.id });
}
