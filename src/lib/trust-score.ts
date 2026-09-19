import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const MIN_TRUST_SCORE = 0;
const MAX_TRUST_SCORE = 100;

/**
 * Every automatic trust-score adjustment in the app goes through here instead
 * of scattering `Math.min(100, user.trustScore + 5)` inline at each call site
 * (previously duplicated across escrow complete/confirm-handover/trustless-
 * handover with no penalty path at all). Clamps to [0, 100] and returns the
 * resulting score so callers can notify/log without a second read.
 *
 * Idempotent by construction for a given call: it's a single read-modify-write
 * inside whatever transaction the caller is already in, so calling it twice
 * for the same event would double-apply — callers are responsible for only
 * calling it once per event (the existing completion routes already guard
 * against double-processing the same escrow via their own status re-checks).
 */
export async function adjustTrustScore(
  tx: Prisma.TransactionClient | typeof prisma,
  userId: string,
  delta: number,
): Promise<number> {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { trustScore: true } });
  const newScore = Math.max(MIN_TRUST_SCORE, Math.min(MAX_TRUST_SCORE, user.trustScore + delta));
  await tx.user.update({ where: { id: userId }, data: { trustScore: newScore } });
  return newScore;
}

/** Named deltas so the magnitude lives in one place, not repeated as a magic number. */
export const TRUST_SCORE_DELTA = {
  /** Both parties, on any successful escrow completion path. */
  ESCROW_COMPLETED: 5,
  /**
   * The losing side of an admin-ruled dispute — i.e. the admin determined
   * their claim/behavior was not the one at fault. Deliberately small and
   * one-directional-per-event (the winner gets no bonus beyond the normal
   * completion credit, since winning a dispute isn't an achievement, just
   * the absence of being found responsible). Not applied to escrow
   * cancellations, which are a normal buyer-initiated state transition with
   * a full refund, not a fault-finding event — there is no admin ruling to
   * base a penalty on there.
   */
  DISPUTE_LOST: -5,
} as const;
