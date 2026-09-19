import type {
  ListingStatus,
  OfferStatus,
  EscrowStatus,
  VerifiedBadge,
  TransactionType,
  NotificationType,
  Platform,
  AdsenseStatus,
} from "@prisma/client";

interface StatusStyle {
  label: string;
  className: string;
}

export const LISTING_STATUS_STYLE: Record<ListingStatus, StatusStyle> = {
  DRAFT: { label: "Draft", className: "bg-muted/10 text-muted" },
  PENDING: { label: "Pending Review", className: "bg-warning/10 text-warning" },
  ACTIVE: { label: "Active", className: "bg-success/10 text-success" },
  SOLD: { label: "Sold", className: "bg-brand-100 text-brand-700" },
  REJECTED: { label: "Rejected", className: "bg-danger/10 text-danger" },
  SUSPENDED: { label: "Suspended", className: "bg-danger/10 text-danger" },
  EXPIRED: { label: "Expired", className: "bg-muted/10 text-muted" },
};

export const OFFER_STATUS_STYLE: Record<OfferStatus, StatusStyle> = {
  PENDING: { label: "Pending", className: "bg-warning/10 text-warning" },
  ACCEPTED: { label: "Accepted", className: "bg-success/10 text-success" },
  DECLINED: { label: "Declined", className: "bg-danger/10 text-danger" },
  EXPIRED: { label: "Expired", className: "bg-muted/10 text-muted" },
  COUNTERED: { label: "Countered", className: "bg-info/10 text-info" },
  CANCELLED: { label: "Cancelled", className: "bg-muted/10 text-muted" },
};

export const ESCROW_STATUS_STYLE: Record<EscrowStatus, StatusStyle> = {
  FUNDED:                { label: "Funded",                className: "bg-info/10 text-info" },
  AWAITING_MANAGER_ADD:  { label: "Awaiting Manager Add",  className: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400" },
  PENDING_VERIFICATION:  { label: "Pending Verification",  className: "bg-amber-100 text-amber-700" },
  SUBMITTED:             { label: "Details Submitted",     className: "bg-warning/10 text-warning" },
  VERIFIED:              { label: "Access Verified",       className: "bg-brand-100 text-brand-700" },
  IN_TRANSFER:           { label: "Transferring",          className: "bg-brand-100 text-brand-700" },
  COMPLETED:             { label: "Completed",             className: "bg-success/10 text-success" },
  CANCELLED:             { label: "Cancelled",             className: "bg-muted/10 text-muted" },
  DISPUTED:              { label: "Disputed",              className: "bg-danger/10 text-danger" },
};

// Full 7-step flow for manager-add escrows; legacy flow uses a filtered subset
export const ESCROW_STEPS: EscrowStatus[] = [
  "FUNDED",
  "AWAITING_MANAGER_ADD",
  "PENDING_VERIFICATION",
  "SUBMITTED",
  "VERIFIED",
  "IN_TRANSFER",
  "COMPLETED",
];

export const ESCROW_STEPS_LEGACY: EscrowStatus[] = [
  "FUNDED",
  "SUBMITTED",
  "VERIFIED",
  "IN_TRANSFER",
  "COMPLETED",
];

export const VERIFIED_BADGE_STYLE: Record<
  VerifiedBadge,
  { label: string; className: string; visible: boolean }
> = {
  NONE:     { label: "",                  className: "",                             visible: false },
  BLUE:     { label: "Verified",           className: "text-info",                    visible: true  },
  GOLD:     { label: "Business",           className: "text-brand-500",               visible: true  },
  GREY:     { label: "Official",           className: "text-muted",                   visible: true  },
  OFFICIAL: { label: "✓ Official Support", className: "text-brand-500 font-semibold", visible: true  },
};

export const TRANSACTION_CREDIT_TYPES: TransactionType[] = [
  "DEPOSIT",
  "ESCROW_RELEASE",
  "WALLET_CREDIT",
  "REFUND",
];

export function isCreditTransaction(type: TransactionType): boolean {
  return TRANSACTION_CREDIT_TYPES.includes(type);
}

export const NOTIFICATION_ICON: Record<NotificationType, string> = {
  LISTING: "list",
  LISTING_APPROVED: "check-circle",
  LISTING_REJECTED: "x-circle",
  OFFER: "hand-coins",
  ESCROW: "shield-check",
  MESSAGE: "message-circle",
  PAYMENT: "credit-card",
  DEPOSIT_CONFIRMED: "wallet",
  SYSTEM: "info",
  DISPUTE: "alert-triangle",
  SECURITY: "lock",
};

export const PLATFORM_LABEL: Record<Platform, string> = {
  YOUTUBE: "YouTube",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  FACEBOOK: "Facebook",
  TELEGRAM: "Telegram",
  TWITTER_X: "X (Twitter)",
  SNAPCHAT: "Snapchat",
  PINTEREST: "Pinterest",
  LINKEDIN: "LinkedIn",
  WEBSITE: "Website",
};

export const PLATFORM_COLOR: Record<Platform, string> = {
  YOUTUBE: "#FF0000",
  INSTAGRAM: "#E1306C",
  TIKTOK: "#010101",
  FACEBOOK: "#1877F2",
  TELEGRAM: "#26A5E4",
  TWITTER_X: "#14171A",
  SNAPCHAT: "#FFFC00",
  PINTEREST: "#E60023",
  LINKEDIN: "#0A66C2",
  WEBSITE: "#f97316",
};

export const ADSENSE_STATUS_STYLE: Record<AdsenseStatus, StatusStyle & { show: boolean }> = {
  ON:         { label: "Adsense ✓",         className: "bg-success/10 text-success",  show: true  },
  CHANGEABLE: { label: "Adsense Changeable", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", show: true  },
  OFF:        { label: "No Adsense",         className: "bg-muted/10 text-muted",      show: false },
};

export function standingLabel(strikeCount: number, warningCount: number): string {
  if (strikeCount === 0 && warningCount === 0) return "Good Standing";
  const parts = [];
  if (strikeCount > 0) parts.push(`${strikeCount} Strike${strikeCount > 1 ? "s" : ""}`);
  if (warningCount > 0) parts.push(`${warningCount} Warning${warningCount > 1 ? "s" : ""}`);
  return parts.join(", ");
}

export function standingPillClass(strikeCount: number, warningCount: number): string {
  if (strikeCount > 0) return "bg-danger/10 text-danger";
  if (warningCount > 0) return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
  return "bg-success/10 text-success";
}

const FLAG_MAP: Record<string, string> = {
  US: "🇺🇸", GB: "🇬🇧", CA: "🇨🇦", AU: "🇦🇺", DE: "🇩🇪", FR: "🇫🇷", IN: "🇮🇳",
  BR: "🇧🇷", PK: "🇵🇰", NG: "🇳🇬", EG: "🇪🇬", SA: "🇸🇦", AE: "🇦🇪", TR: "🇹🇷",
  ID: "🇮🇩", PH: "🇵🇭", MX: "🇲🇽", RU: "🇷🇺", UA: "🇺🇦", PL: "🇵🇱", NL: "🇳🇱",
  IT: "🇮🇹", ES: "🇪🇸", SE: "🇸🇪", NO: "🇳🇴", DK: "🇩🇰", FI: "🇫🇮", CH: "🇨🇭",
  AT: "🇦🇹", BE: "🇧🇪", PT: "🇵🇹", GR: "🇬🇷", CZ: "🇨🇿", HU: "🇭🇺", RO: "🇷🇴",
  JP: "🇯🇵", KR: "🇰🇷", CN: "🇨🇳", SG: "🇸🇬", TH: "🇹🇭", MY: "🇲🇾", VN: "🇻🇳",
  NZ: "🇳🇿", ZA: "🇿🇦", KE: "🇰🇪", GH: "🇬🇭", MA: "🇲🇦", IL: "🇮🇱", QA: "🇶🇦",
  KW: "🇰🇼", BH: "🇧🇭", JO: "🇯🇴", LB: "🇱🇧", IQ: "🇮🇶", IR: "🇮🇷", PY: "🇵🇾",
  CO: "🇨🇴", AR: "🇦🇷", CL: "🇨🇱", PE: "🇵🇪", VE: "🇻🇪", OTHER: "🌍",
};

export function countryFlag(code: string): string {
  return FLAG_MAP[code.toUpperCase()] ?? "🌍";
}

export interface TrustTier {
  label: string;
  className: string;
}

export function getTrustTier(trustScore: number): TrustTier {
  if (trustScore >= 90) return { label: "Legend", className: "text-brand-600" };
  if (trustScore >= 75) return { label: "Elite", className: "text-info" };
  if (trustScore >= 50) return { label: "Trusted", className: "text-success" };
  if (trustScore >= 20) return { label: "Rising", className: "text-warning" };
  return { label: "New", className: "text-muted" };
}

export const OFFER_EXPIRY_HOURS = 72;

export const COUNTRIES = [
  { code: "US", name: "United States",  flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada",         flag: "🇨🇦" },
  { code: "AU", name: "Australia",      flag: "🇦🇺" },
  { code: "DE", name: "Germany",        flag: "🇩🇪" },
  { code: "FR", name: "France",         flag: "🇫🇷" },
  { code: "IN", name: "India",          flag: "🇮🇳" },
  { code: "BR", name: "Brazil",         flag: "🇧🇷" },
  { code: "PK", name: "Pakistan",       flag: "🇵🇰" },
  { code: "NG", name: "Nigeria",        flag: "🇳🇬" },
  { code: "EG", name: "Egypt",          flag: "🇪🇬" },
  { code: "SA", name: "Saudi Arabia",   flag: "🇸🇦" },
  { code: "AE", name: "UAE",            flag: "🇦🇪" },
  { code: "TR", name: "Turkey",         flag: "🇹🇷" },
  { code: "ID", name: "Indonesia",      flag: "🇮🇩" },
  { code: "PH", name: "Philippines",    flag: "🇵🇭" },
  { code: "MX", name: "Mexico",         flag: "🇲🇽" },
  { code: "RU", name: "Russia",         flag: "🇷🇺" },
  { code: "UA", name: "Ukraine",        flag: "🇺🇦" },
  { code: "PL", name: "Poland",         flag: "🇵🇱" },
  { code: "NL", name: "Netherlands",    flag: "🇳🇱" },
  { code: "IT", name: "Italy",          flag: "🇮🇹" },
  { code: "ES", name: "Spain",          flag: "🇪🇸" },
  { code: "SE", name: "Sweden",         flag: "🇸🇪" },
  { code: "NO", name: "Norway",         flag: "🇳🇴" },
  { code: "DK", name: "Denmark",        flag: "🇩🇰" },
  { code: "FI", name: "Finland",        flag: "🇫🇮" },
  { code: "CH", name: "Switzerland",    flag: "🇨🇭" },
  { code: "AT", name: "Austria",        flag: "🇦🇹" },
  { code: "BE", name: "Belgium",        flag: "🇧🇪" },
  { code: "PT", name: "Portugal",       flag: "🇵🇹" },
  { code: "GR", name: "Greece",         flag: "🇬🇷" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "HU", name: "Hungary",        flag: "🇭🇺" },
  { code: "RO", name: "Romania",        flag: "🇷🇴" },
  { code: "JP", name: "Japan",          flag: "🇯🇵" },
  { code: "KR", name: "South Korea",    flag: "🇰🇷" },
  { code: "CN", name: "China",          flag: "🇨🇳" },
  { code: "SG", name: "Singapore",      flag: "🇸🇬" },
  { code: "TH", name: "Thailand",       flag: "🇹🇭" },
  { code: "MY", name: "Malaysia",       flag: "🇲🇾" },
  { code: "VN", name: "Vietnam",        flag: "🇻🇳" },
  { code: "NZ", name: "New Zealand",    flag: "🇳🇿" },
  { code: "ZA", name: "South Africa",   flag: "🇿🇦" },
  { code: "KE", name: "Kenya",          flag: "🇰🇪" },
  { code: "GH", name: "Ghana",          flag: "🇬🇭" },
  { code: "MA", name: "Morocco",        flag: "🇲🇦" },
  { code: "IL", name: "Israel",         flag: "🇮🇱" },
  { code: "QA", name: "Qatar",          flag: "🇶🇦" },
  { code: "KW", name: "Kuwait",         flag: "🇰🇼" },
  { code: "BH", name: "Bahrain",        flag: "🇧🇭" },
  { code: "JO", name: "Jordan",         flag: "🇯🇴" },
  { code: "LB", name: "Lebanon",        flag: "🇱🇧" },
  { code: "IQ", name: "Iraq",           flag: "🇮🇶" },
  { code: "IR", name: "Iran",           flag: "🇮🇷" },
  { code: "PY", name: "Paraguay",       flag: "🇵🇾" },
  { code: "CO", name: "Colombia",       flag: "🇨🇴" },
  { code: "AR", name: "Argentina",      flag: "🇦🇷" },
  { code: "CL", name: "Chile",          flag: "🇨🇱" },
  { code: "PE", name: "Peru",           flag: "🇵🇪" },
  { code: "VE", name: "Venezuela",      flag: "🇻🇪" },
  { code: "OTHER", name: "Other",        flag: "🌍" },
] as const;

export type CountryCode = typeof COUNTRIES[number]["code"];

export const RATE_LIMITS = {
  REGISTRATION: { limit: 3, windowSeconds: 60 * 60 },
  MESSAGES: { limit: 10, windowSeconds: 60 },
  OFFERS: { limit: 5, windowSeconds: 5 * 60 },
  ESCROW_CREATION: { limit: 3, windowSeconds: 60 * 60 },
  LISTING_CREATION: { limit: 5, windowSeconds: 60 * 60 },
  MANUAL_DEPOSITS: { limit: 5, windowSeconds: 60 * 60 },
  RESEND_VERIFICATION: { limit: 1, windowSeconds: 2 * 60 },
  WHATSAPP_OTP: { limit: 5, windowSeconds: 60 * 60 },
} as const;
