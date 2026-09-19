import { describe, it, expect } from "vitest";
import { calculateEscrowFee, calculateDepositFee, getPlanFeeConfig } from "./fees";

describe("calculateEscrowFee", () => {
  it("applies the percentage fee when it exceeds the minimum", () => {
    const result = calculateEscrowFee(1000, 0.05, 4);
    expect(result.escrowFee).toBe(50);
    expect(result.buyerTotal).toBe(1050);
    expect(result.sellerReceives).toBe(1000);
  });

  it("falls back to the minimum fee for small prices", () => {
    const result = calculateEscrowFee(10, 0.05, 4);
    // 10 * 0.05 = 0.5, below the $4 minimum
    expect(result.escrowFee).toBe(4);
    expect(result.buyerTotal).toBe(14);
  });

  it("rounds to 2 decimal places", () => {
    const result = calculateEscrowFee(33.33, 0.03, 3);
    expect(result.escrowFee).toBe(3);
    expect(Number.isInteger(result.buyerTotal * 100)).toBe(true);
  });

  it("seller always receives the full price regardless of fee", () => {
    const result = calculateEscrowFee(500, 0.1, 10);
    expect(result.sellerReceives).toBe(500);
    expect(result.buyerTotal).toBeGreaterThan(result.sellerReceives);
  });
});

describe("calculateDepositFee", () => {
  it("applies percentage fee above the minimum", () => {
    expect(calculateDepositFee(1000, 0.02, 1)).toBe(20);
  });

  it("floors at the minimum fee", () => {
    expect(calculateDepositFee(10, 0.02, 5)).toBe(5);
  });

  it("caps at the maximum fee when provided", () => {
    expect(calculateDepositFee(100000, 0.02, 1, 50)).toBe(50);
  });

  it("does not cap when maxFee is not provided", () => {
    expect(calculateDepositFee(100000, 0.02, 1)).toBe(2000);
  });
});

describe("getPlanFeeConfig", () => {
  it("returns the configured rate for a known plan", () => {
    expect(getPlanFeeConfig("PRO")).toEqual({ rate: 0.03, minFee: 3 });
  });

  it("falls back to FREE for an unknown plan name", () => {
    expect(getPlanFeeConfig("NONEXISTENT")).toEqual(getPlanFeeConfig("FREE"));
  });
});
