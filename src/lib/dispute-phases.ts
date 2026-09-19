import { DisputePhase } from "@prisma/client";

export type PhaseTransition = {
  from: DisputePhase;
  to: DisputePhase;
  label: string;
  requiresAdmin: boolean;
};

export const PHASE_TRANSITIONS: PhaseTransition[] = [
  { from: "EVIDENCE", to: "REVIEW",    label: "Close Evidence & Start Review", requiresAdmin: true },
  { from: "REVIEW",   to: "MEDIATION", label: "Propose Mediation",             requiresAdmin: true },
  { from: "REVIEW",   to: "RULING",    label: "Skip to Ruling",                requiresAdmin: true },
  { from: "MEDIATION",to: "RULING",    label: "Mediation Failed → Ruling",     requiresAdmin: true },
  { from: "MEDIATION",to: "FINAL",     label: "Mediation Accepted → Final",    requiresAdmin: true },
  { from: "RULING",   to: "APPEAL",    label: "Submit Appeal",                 requiresAdmin: false },
  { from: "RULING",   to: "FINAL",     label: "Finalize Ruling",               requiresAdmin: true },
  { from: "APPEAL",   to: "FINAL",     label: "Review Appeal → Final",         requiresAdmin: true },
];

export function getAllowedTransitions(phase: DisputePhase, isAdmin: boolean): PhaseTransition[] {
  return PHASE_TRANSITIONS.filter(
    (t) => t.from === phase && (isAdmin || !t.requiresAdmin)
  );
}

export const PHASE_LABELS: Record<DisputePhase, string> = {
  EVIDENCE:  "Evidence Gathering",
  REVIEW:    "Under Review",
  MEDIATION: "Mediation",
  RULING:    "Ruling",
  APPEAL:    "Appeal",
  FINAL:     "Final",
};

export const PHASE_DESCRIPTIONS: Record<DisputePhase, string> = {
  EVIDENCE:  "Both parties are submitting evidence. Deadline applies.",
  REVIEW:    "Admin is reviewing the submitted evidence.",
  MEDIATION: "Admin has proposed a settlement. Both parties must respond.",
  RULING:    "Admin has issued a ruling. 24-hour appeal window is open.",
  APPEAL:    "A party has appealed the ruling. Senior admin reviewing.",
  FINAL:     "The dispute has been concluded. No further changes.",
};

export const PHASE_COLORS: Record<DisputePhase, string> = {
  EVIDENCE:  "bg-blue-50 text-blue-700 border-blue-200",
  REVIEW:    "bg-amber-50 text-amber-700 border-amber-200",
  MEDIATION: "bg-purple-50 text-purple-700 border-purple-200",
  RULING:    "bg-orange-50 text-orange-700 border-orange-200",
  APPEAL:    "bg-red-50 text-red-700 border-red-200",
  FINAL:     "bg-green-50 text-green-700 border-green-200",
};
