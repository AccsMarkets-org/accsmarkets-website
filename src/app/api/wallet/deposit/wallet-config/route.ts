import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.platformSettings.findUnique({
    where: { id: "singleton" },
    select: {
      walletAddressTrc20: true,
      walletAddressBep20: true,
      walletAddressErc20: true,
      walletAddressMatic: true,
      walletAddressSol: true,
    },
  });

  return NextResponse.json({
    TRC20: settings?.walletAddressTrc20 ?? null,
    BEP20: settings?.walletAddressBep20 ?? null,
    ERC20: settings?.walletAddressErc20 ?? null,
    POLYGON: settings?.walletAddressMatic ?? null,
    SOLANA: settings?.walletAddressSol ?? null,
  });
}
