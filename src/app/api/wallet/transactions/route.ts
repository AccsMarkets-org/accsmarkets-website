import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
  const skip = (page - 1) * limit;

  const [user, transactions, total] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { walletBalance: true },
    }),
    prisma.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        createdAt: true,
        escrowId: true,
        balanceBefore: true,
        balanceAfter: true,
        metadata: true,
      },
    }),
    prisma.transaction.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({
    balance: user?.walletBalance?.toString() ?? "0.00",
    transactions: transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      status: tx.status,
      amount: tx.amount.toString(),
      createdAt: tx.createdAt.toISOString(),
      escrowId: tx.escrowId ?? null,
      balanceBefore: tx.balanceBefore?.toString() ?? null,
      balanceAfter: tx.balanceAfter?.toString() ?? null,
      metadata: tx.metadata ?? null,
    })),
    total,
    hasMore: skip + limit < total,
    page,
  });
}
