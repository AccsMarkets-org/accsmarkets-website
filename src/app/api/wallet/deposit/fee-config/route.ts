import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const fee = await prisma.depositMethodFee.findUnique({ where: { method: "crypto" } }).catch(() => null);
  return NextResponse.json({
    feeRate: fee ? Number(fee.feeRate) : 0,
    minFee: fee ? Number(fee.minFee) : 0,
    maxFee: fee?.maxFee != null ? Number(fee.maxFee) : null,
    minAmount: 1,
  });
}
