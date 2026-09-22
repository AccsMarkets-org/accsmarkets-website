import type { Prisma, ListingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Shared seller-side listing status transition rules. Used by the single
 * pause / unpause / mark-sold / relist / delete routes and by the bulk route so
 * both paths enforce exactly the same guards.
 */

export type SellerListingAction = "pause" | "unpause" | "mark_sold" | "relist" | "delete";

/** Escrow statuses that mean money is still held — the listing must not be deleted. */
export const OPEN_ESCROW_STATUSES = [
  "FUNDED",
  "AWAITING_MANAGER_ADD",
  "PENDING_VERIFICATION",
  "SUBMITTED",
  "VERIFIED",
  "IN_TRANSFER",
  "DISPUTED",
] as const;

/** Statuses a seller may delete from (subject to the escrow guard below). */
export const DELETABLE_STATUSES: ListingStatus[] = ["DRAFT", "PENDING", "REJECTED", "EXPIRED", "ACTIVE", "PAUSED"];

export const ACTION_TARGET: Record<Exclude<SellerListingAction, "delete">, ListingStatus> = {
  pause: "PAUSED",
  unpause: "ACTIVE",
  mark_sold: "SOLD",
  relist: "ACTIVE",
};

/**
 * Returns null when the transition is allowed, otherwise a human-readable reason.
 * Pure — no DB access. The delete escrow guard is `deleteBlockReason` below.
 */
export function transitionBlockReason(status: ListingStatus, action: SellerListingAction): string | null {
  switch (action) {
    case "pause":
      return status === "ACTIVE" ? null : "Only active listings can be paused.";
    case "unpause":
      return status === "PAUSED" ? null : "Only paused listings can be resumed.";
    case "mark_sold":
      return status === "ACTIVE" || status === "PAUSED" ? null : "Only active or paused listings can be marked as sold.";
    case "relist":
      return status === "SOLD" ? null : "Only sold listings can be relisted.";
    case "delete":
      return DELETABLE_STATUSES.includes(status) ? null : "Sold or suspended listings cannot be deleted.";
  }
}

/**
 * DB-backed delete guard. A listing with any escrow cannot be hard-deleted:
 * an open escrow means funds are held; a closed one is transaction history the
 * buyer may still need to reference (use "Mark sold" instead).
 */
export async function deleteBlockReason(listingId: string): Promise<string | null> {
  const [open, any] = await Promise.all([
    prisma.escrow.count({ where: { listingId, status: { in: [...OPEN_ESCROW_STATUSES] } } }),
    prisma.escrow.count({ where: { listingId } }),
  ]);
  if (open > 0) return "This listing has an active escrow and cannot be deleted.";
  if (any > 0) return "This listing has escrow history and cannot be deleted. Mark it as sold instead.";
  return null;
}

/**
 * Hard-deletes a listing inside a transaction. Offers reference the listing
 * with a restricting FK, so they are removed first (only reachable when the
 * escrow guard above has already passed, i.e. no offer is tied to an escrow).
 */
export async function deleteListingCascade(tx: Prisma.TransactionClient, listingId: string): Promise<void> {
  await tx.offer.deleteMany({ where: { listingId } });
  await tx.listing.delete({ where: { id: listingId } });
}

/** Extra column updates that accompany a status change. */
export function transitionData(action: Exclude<SellerListingAction, "delete">): Prisma.ListingUpdateInput {
  switch (action) {
    case "pause":
      return { status: "PAUSED" };
    case "unpause":
      return { status: "ACTIVE" };
    case "mark_sold":
      return { status: "SOLD", soldAt: new Date() };
    case "relist":
      return { status: "ACTIVE", soldAt: null };
  }
}
