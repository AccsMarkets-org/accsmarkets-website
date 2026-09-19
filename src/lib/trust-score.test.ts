import { describe, it, expect, vi } from "vitest";
import { adjustTrustScore, TRUST_SCORE_DELTA } from "./trust-score";

function fakeTx(initialScore: number) {
  const state = { trustScore: initialScore };
  return {
    tx: {
      user: {
        findUniqueOrThrow: vi.fn(async () => ({ trustScore: state.trustScore })),
        update: vi.fn(async ({ data }: { data: { trustScore: number } }) => {
          state.trustScore = data.trustScore;
          return state;
        }),
      },
    },
    state,
  };
}

describe("adjustTrustScore", () => {
  it("applies a positive delta", async () => {
    const { tx, state } = fakeTx(50);
    const result = await adjustTrustScore(tx as never, "user1", TRUST_SCORE_DELTA.ESCROW_COMPLETED);
    expect(result).toBe(55);
    expect(state.trustScore).toBe(55);
  });

  it("applies a negative delta", async () => {
    const { tx } = fakeTx(50);
    const result = await adjustTrustScore(tx as never, "user1", TRUST_SCORE_DELTA.DISPUTE_LOST);
    expect(result).toBe(45);
  });

  it("clamps at 100 (does not exceed the max)", async () => {
    const { tx } = fakeTx(98);
    const result = await adjustTrustScore(tx as never, "user1", TRUST_SCORE_DELTA.ESCROW_COMPLETED);
    expect(result).toBe(100);
  });

  it("clamps at 0 (does not go negative)", async () => {
    const { tx } = fakeTx(2);
    const result = await adjustTrustScore(tx as never, "user1", TRUST_SCORE_DELTA.DISPUTE_LOST);
    expect(result).toBe(0);
  });

  it("named deltas have the expected sign", () => {
    expect(TRUST_SCORE_DELTA.ESCROW_COMPLETED).toBeGreaterThan(0);
    expect(TRUST_SCORE_DELTA.DISPUTE_LOST).toBeLessThan(0);
  });
});
