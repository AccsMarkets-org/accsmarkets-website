import type { DisputeStatus } from "@prisma/client";

/** Status pill styling for the user-facing dispute centre (mirrors the admin page's wording, minus "won/lost" framing). */
export const DISPUTE_STATUS_STYLE: Record<DisputeStatus, { label: string; className: string }> = {
  OPEN:            { label: "Open",            className: "bg-danger/10 text-danger" },
  UNDER_REVIEW:    { label: "Under review",    className: "bg-warning/10 text-warning" },
  RESOLVED_BUYER:  { label: "Resolved — buyer",  className: "bg-success/10 text-success" },
  RESOLVED_SELLER: { label: "Resolved — seller", className: "bg-success/10 text-success" },
  CLOSED:          { label: "Closed",          className: "bg-muted/10 text-muted" },
};

export const ACTIVE_DISPUTE_STATUSES: DisputeStatus[] = ["OPEN", "UNDER_REVIEW"];
