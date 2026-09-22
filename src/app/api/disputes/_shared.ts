import { prisma } from "@/lib/db";
import { PHASE_LABELS } from "@/lib/dispute-phases";
import type { DisputePhase } from "@prisma/client";

/**
 * User-safe timeline entry. Raw admin descriptions can embed staff notes
 * ("… Note: …"), so we regenerate the text from eventType + metadata and only
 * fall back to the stored description for event types that never carry notes.
 */
function userTimelineDescription(ev: { eventType: string; description: string; metadata: unknown }): string {
  const meta = (ev.metadata && typeof ev.metadata === "object" ? ev.metadata : {}) as Record<string, unknown>;
  switch (ev.eventType) {
    case "phase_change": {
      const to = meta.toPhase as DisputePhase | undefined;
      return to && PHASE_LABELS[to] ? `Dispute moved to “${PHASE_LABELS[to]}”` : "Dispute phase updated";
    }
    case "mediation_offer": {
      const offer = typeof meta.offer === "number" || typeof meta.offer === "string" ? Number(meta.offer) : null;
      return offer !== null && !Number.isNaN(offer) ? `Mediation settlement proposed: $${offer.toFixed(2)}` : "Mediation settlement proposed";
    }
    case "evidence_deadline_passed":
      return "Evidence deadline passed. Awaiting review.";
    case "dispute_opened":
    case "evidence_added":
    case "appeal_submitted":
    case "ruling_issued":
      return ev.description;
    default:
      return ev.description.split(". Note:")[0];
  }
}

/** Loads a dispute for a participant. Returns null when not found or the user is not buyer/seller. */
export async function loadUserDispute(disputeId: string, userId: string) {
  const dispute = await prisma.dispute.findFirst({
    where: { id: disputeId, escrow: { OR: [{ buyerId: userId }, { sellerId: userId }] } },
    include: {
      evidence: { orderBy: { submittedAt: "asc" } },
      timeline: { orderBy: { createdAt: "desc" }, take: 30 },
      escrow: {
        select: {
          id: true, amount: true, status: true, buyerId: true, sellerId: true, createdAt: true,
          listing: { select: { id: true, title: true, platform: true } },
          buyer: { select: { id: true, username: true, name: true, image: true } },
          seller: { select: { id: true, username: true, name: true, image: true } },
        },
      },
    },
  });
  if (!dispute) return null;

  const isBuyer = dispute.escrow.buyerId === userId;
  const counterparty = isBuyer ? dispute.escrow.seller : dispute.escrow.buyer;
  const myEvidence = dispute.evidence.filter((e) => e.userId === userId);
  const theirEvidenceCount = dispute.evidence.filter((e) => e.userId === counterparty.id).length;

  const won =
    dispute.status === "RESOLVED_BUYER" ? isBuyer
    : dispute.status === "RESOLVED_SELLER" ? !isBuyer
    : null;

  return {
    id: dispute.id,
    status: dispute.status,
    phase: dispute.phase,
    reason: dispute.reason,
    openedByMe: dispute.openedById === userId,
    evidenceDeadline: dispute.evidenceDeadline,
    mediationOffer: dispute.mediationOffer !== null ? dispute.mediationOffer.toString() : null,
    mediationAccepted: dispute.mediationAccepted,
    appealedAt: dispute.appealedAt,
    appealReason: dispute.appealReason,
    appealReviewedAt: dispute.appealReviewedAt,
    createdAt: dispute.createdAt,
    resolvedAt: dispute.resolvedAt,
    // Outcome is derived from status; resolution/adminNotes stay staff-only
    // (the ruling email already told the user the generic outcome).
    outcome: won === null ? null : won ? "won" : "lost",
    role: isBuyer ? "buyer" : "seller",
    escrow: {
      id: dispute.escrow.id,
      amount: dispute.escrow.amount.toString(),
      status: dispute.escrow.status,
      createdAt: dispute.escrow.createdAt,
      listing: dispute.escrow.listing,
    },
    counterparty: { id: counterparty.id, username: counterparty.username, name: counterparty.name, image: counterparty.image },
    myEvidence: myEvidence.map((e) => ({ id: e.id, statement: e.statement, submittedAt: e.submittedAt, attachments: e.attachments })),
    theirEvidenceCount,
    timeline: dispute.timeline.map((ev) => ({
      id: ev.id,
      eventType: ev.eventType,
      actorId: ev.actorId,
      description: userTimelineDescription(ev),
      createdAt: ev.createdAt,
    })),
  };
}

export type UserDisputeDetail = NonNullable<Awaited<ReturnType<typeof loadUserDispute>>>;
