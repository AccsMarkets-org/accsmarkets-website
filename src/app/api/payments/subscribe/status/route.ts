import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const walletId = searchParams.get("walletId");
  if (!walletId) return NextResponse.json({ error: "Missing walletId" }, { status: 400 });

  let wallet;
  try {
    wallet = await prisma.cryptoWallet.findUnique({ where: { id: walletId } });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
  if (!wallet || wallet.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ status: wallet.status });
}
