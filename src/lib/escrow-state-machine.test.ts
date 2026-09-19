import { describe, it, expect } from "vitest";
import { canTransition, assertTransition, EscrowTransitionError, ESCROW_TRANSITIONS } from "./escrow-state-machine";
import type { EscrowStatus } from "@prisma/client";

describe("escrow state machine", () => {
  it("allows the standard happy-path transitions", () => {
    expect(canTransition("FUNDED", "SUBMITTED")).toBe(true);
    expect(canTransition("SUBMITTED", "VERIFIED")).toBe(true);
    expect(canTransition("VERIFIED", "IN_TRANSFER")).toBe(true);
    expect(canTransition("IN_TRANSFER", "COMPLETED")).toBe(true);
  });

  it("allows the manager-add happy path", () => {
    expect(canTransition("FUNDED", "AWAITING_MANAGER_ADD")).toBe(true);
    expect(canTransition("AWAITING_MANAGER_ADD", "PENDING_VERIFICATION")).toBe(true);
    expect(canTransition("PENDING_VERIFICATION", "SUBMITTED")).toBe(true);
  });

  it("allows cancellation only from early states", () => {
    expect(canTransition("FUNDED", "CANCELLED")).toBe(true);
    expect(canTransition("AWAITING_MANAGER_ADD", "CANCELLED")).toBe(true);
    expect(canTransition("PENDING_VERIFICATION", "CANCELLED")).toBe(true);
    expect(canTransition("SUBMITTED", "CANCELLED")).toBe(false);
    expect(canTransition("VERIFIED", "CANCELLED")).toBe(false);
    expect(canTransition("IN_TRANSFER", "CANCELLED")).toBe(false);
  });

  it("allows disputing from any active (non-terminal) state", () => {
    const activeStates: EscrowStatus[] = [
      "FUNDED",
      "AWAITING_MANAGER_ADD",
      "PENDING_VERIFICATION",
      "SUBMITTED",
      "VERIFIED",
      "IN_TRANSFER",
    ];
    for (const state of activeStates) {
      expect(canTransition(state, "DISPUTED")).toBe(true);
    }
  });

  it("allows VERIFIED to complete directly for milestone-based escrows", () => {
    // Regression test for the Phase 0 fix: milestone escrows have no
    // IN_TRANSFER phase, so the release route completes directly from
    // VERIFIED. This must remain a deliberate, explicit allowance in the
    // transition table (not a silent status write bypassing it).
    expect(canTransition("VERIFIED", "COMPLETED")).toBe(true);
  });

  it("does not allow completing from any other non-IN_TRANSFER, non-VERIFIED state", () => {
    expect(canTransition("FUNDED", "COMPLETED")).toBe(false);
    expect(canTransition("AWAITING_MANAGER_ADD", "COMPLETED")).toBe(false);
    expect(canTransition("PENDING_VERIFICATION", "COMPLETED")).toBe(false);
    expect(canTransition("SUBMITTED", "COMPLETED")).toBe(false);
  });

  it("treats terminal states as having no outgoing transitions", () => {
    expect(ESCROW_TRANSITIONS.COMPLETED).toEqual([]);
    expect(ESCROW_TRANSITIONS.CANCELLED).toEqual([]);
    expect(ESCROW_TRANSITIONS.DISPUTED).toEqual([]);
  });

  it("assertTransition throws EscrowTransitionError on an illegal move", () => {
    expect(() => assertTransition("COMPLETED", "IN_TRANSFER")).toThrow(EscrowTransitionError);
    expect(() => assertTransition("FUNDED", "COMPLETED")).toThrow(EscrowTransitionError);
  });

  it("assertTransition does not throw on a legal move", () => {
    expect(() => assertTransition("VERIFIED", "COMPLETED")).not.toThrow();
    expect(() => assertTransition("IN_TRANSFER", "COMPLETED")).not.toThrow();
  });
});
