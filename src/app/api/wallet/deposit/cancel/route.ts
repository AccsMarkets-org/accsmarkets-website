import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { walletId } = (await req.json().catch(() => ({}))) as { walletId?: unknown };
  if (typeof walletId !== "string" || !walletId) return NextResponse.json({ error: "walletId required" }, { status: 400 });

  const wallet = await prisma.cryptoWallet.findUnique({ where: { id: walletId } });
  if (!wallet || wallet.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (wallet.status !== "waiting") {
    return NextResponse.json({ error: "Deposit cannot be cancelled in its current state." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.cryptoWallet.update({ where: { id: walletId }, data: { status: "failed" } }),
    prisma.transaction.updateMany({
      where: {
        userId: session.user.id,
        type: "DEPOSIT",
        status: "PENDING",
        metadata: { path: "$.cryptoWalletId", equals: walletId },
      },
      data: { status: "FAILED" },
    }),
  ]);

  return NextResponse.json({ success: true });
}
