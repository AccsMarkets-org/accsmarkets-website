import { getServerSession } from "next-auth";
import dynamic from "next/dynamic";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

const WalletClient = dynamic(
  () => import("@/components/wallet/WalletClient").then((m) => ({ default: m.WalletClient })),
  { ssr: false }
);

export default async function WalletPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [user, transactions, activeEscrows, depositAgg, earningsAgg] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.escrow.aggregate({
      where: {
        buyerId: userId,
        status: { in: ["FUNDED", "SUBMITTED", "VERIFIED", "IN_TRANSFER", "DISPUTED"] },
      },
      _sum: { totalCharged: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "DEPOSIT", status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "ESCROW_RELEASE", status: "COMPLETED" },
      _sum: { amount: true },
    }),
  ]);

  const totalBalance = Number(user.walletBalance);
  const reserved = Number(activeEscrows._sum.totalCharged ?? 0);
  const available = Math.max(0, totalBalance - reserved);
  const totalDeposited = Number(depositAgg._sum?.amount ?? 0);
  const totalEarned = Number(earningsAgg._sum?.amount ?? 0);

  return (
    <WalletClient
      totalBalance={totalBalance}
      available={available}
      reserved={reserved}
      totalDeposited={totalDeposited}
      totalEarned={totalEarned}
      transactions={transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount.toString(),
        status: t.status,
        reference: t.cryptoPaymentId ?? null,
        createdAt: t.createdAt.toISOString(),
      }))}
    />
  );
}
