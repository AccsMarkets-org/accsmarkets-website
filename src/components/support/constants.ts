import type { SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from "@prisma/client";

export const TICKET_CATEGORIES: { value: SupportTicketCategory; label: string; hint: string }[] = [
  { value: "ACCOUNT",   label: "Account",        hint: "Login, profile, settings, 2FA" },
  { value: "PAYMENT",   label: "Payments",       hint: "Deposits, withdrawals, wallet" },
  { value: "ESCROW",    label: "Escrow / Order", hint: "A deal in progress or completed" },
  { value: "LISTING",   label: "Listing",        hint: "Approval, editing, promotion" },
  { value: "KYC",       label: "Verification",   hint: "Identity or business verification" },
  { value: "TECHNICAL", label: "Technical",      hint: "Bugs, errors, something broken" },
  { value: "OTHER",     label: "Other",          hint: "Anything else" },
];

export const CATEGORY_LABEL: Record<SupportTicketCategory, string> = Object.fromEntries(
  TICKET_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<SupportTicketCategory, string>;

export const TICKET_STATUS_STYLE: Record<SupportTicketStatus, { label: string; userLabel: string; className: string }> = {
  OPEN:           { label: "Open",           userLabel: "Open",              className: "bg-info/10 text-info" },
  AWAITING_STAFF: { label: "Awaiting staff", userLabel: "Waiting on support", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  AWAITING_USER:  { label: "Awaiting user",  userLabel: "Support replied",   className: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400" },
  RESOLVED:       { label: "Resolved",       userLabel: "Resolved",          className: "bg-success/10 text-success" },
  CLOSED:         { label: "Closed",         userLabel: "Closed",            className: "bg-muted/10 text-muted" },
};

export const TICKET_PRIORITY_STYLE: Record<SupportTicketPriority, { label: string; className: string }> = {
  LOW:    { label: "Low",    className: "bg-muted/10 text-muted" },
  NORMAL: { label: "Normal", className: "bg-info/10 text-info" },
  HIGH:   { label: "High",   className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  URGENT: { label: "Urgent", className: "bg-danger/10 text-danger" },
};

export const TICKET_STATUSES: SupportTicketStatus[] = ["OPEN", "AWAITING_STAFF", "AWAITING_USER", "RESOLVED", "CLOSED"];
export const TICKET_PRIORITIES: SupportTicketPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

/** Statuses the user sees under the "Open" filter. */
export const OPEN_TICKET_STATUSES: SupportTicketStatus[] = ["OPEN", "AWAITING_STAFF", "AWAITING_USER"];
export const CLOSED_TICKET_STATUSES: SupportTicketStatus[] = ["RESOLVED", "CLOSED"];

export const MAX_TICKET_ATTACHMENTS = 3;
/** Days after resolution during which a user can reopen their ticket. */
export const REOPEN_WINDOW_DAYS = 7;

export interface TicketAttachment {
  url: string;
  name: string;
}

export function parseAttachments(raw: unknown): TicketAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a): a is TicketAttachment => !!a && typeof a === "object" && typeof (a as TicketAttachment).url === "string")
    .map((a) => ({ url: a.url, name: typeof a.name === "string" && a.name ? a.name : "Attachment" }));
}
