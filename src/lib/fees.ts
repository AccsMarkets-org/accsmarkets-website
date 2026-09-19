import { round2 } from "@/lib/utils";

export interface FeeCalcResult {
  escrowFee: number;
  buyerTotal: number;
  sellerReceives: number;
}

export function calculateEscrowFee(price: number, feeRate: number, minFee: number): FeeCalcResult {
  const escrowFee = Math.max(round2(price * feeRate), minFee);
  return {
    escrowFee,
    buyerTotal: round2(price + escrowFee),
    sellerReceives: price,
  };
}

const PLAN_FEE_CONFIG: Record<string, { rate: number; minFee: number }> = {
  FREE: { rate: 0.05, minFee: 4 },
  STARTER: { rate: 0.04, minFee: 3 },
  PRO: { rate: 0.03, minFee: 3 },
  ENTERPRISE: { rate: 0.02, minFee: 2 },
};

/** Static fallback matching the seeded plan rates — used only if a live plan record can't be read. */
export function getPlanFeeConfig(planName: string): { rate: number; minFee: number } {
  return PLAN_FEE_CONFIG[planName] ?? PLAN_FEE_CONFIG.FREE;
}

export function calculateDepositFee(
  amountUsd: number,
  feeRate: number,
  minFee: number,
  maxFee?: number | null,
): number {
  const fee = Math.max(round2(amountUsd * feeRate), minFee);
  return maxFee != null ? Math.min(fee, maxFee) : fee;
}
