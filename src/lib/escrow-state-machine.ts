import type { EscrowStatus } from "@prisma/client";

export const ESCROW_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
  FUNDED:                ["AWAITING_MANAGER_ADD", "SUBMITTED", "CANCELLED", "DISPUTED"],
  AWAITING_MANAGER_ADD:  ["PENDING_VERIFICATION", "CANCELLED", "DISPUTED"],
  PENDING_VERIFICATION:  ["SUBMITTED", "CANCELLED", "DISPUTED"],
  SUBMITTED:             ["VERIFIED", "DISPUTED"],
  // COMPLETED is reachable directly from VERIFIED for milestone-based escrows,
  // whose release route (escrows/[id]/milestones/[milestoneId]/release) marks
  // the escrow complete as soon as the last milestone is released — there is
  // no separate IN_TRANSFER phase for that flow.
  VERIFIED:              ["IN_TRANSFER", "COMPLETED", "DISPUTED"],
  IN_TRANSFER:           ["COMPLETED", "DISPUTED"],
  COMPLETED:             [],
  CANCELLED:             [],
  DISPUTED:              [], // RESOLVED_BUYER/RESOLVED_SELLER deferred to dispute phase
};

export class EscrowTransitionError extends Error {
  constructor(current: EscrowStatus, next: EscrowStatus) {
    super(`Cannot move escrow from ${current} to ${next}`);
    this.name = "EscrowTransitionError";
  }
}

export function canTransition(current: EscrowStatus, next: EscrowStatus): boolean {
  return ESCROW_TRANSITIONS[current].includes(next);
}

export function assertTransition(current: EscrowStatus, next: EscrowStatus): void {
  if (!canTransition(current, next)) {
    throw new EscrowTransitionError(current, next);
  }
}
