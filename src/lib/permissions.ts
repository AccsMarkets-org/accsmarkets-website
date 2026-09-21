export const PERMISSIONS = {
  MANAGE_USERS: "MANAGE_USERS",
  MANAGE_ESCROWS: "MANAGE_ESCROWS",
  MANAGE_ESCROW_MESSAGES: "MANAGE_ESCROW_MESSAGES",
  MANAGE_DISPUTES: "MANAGE_DISPUTES",
  MANAGE_LISTINGS: "MANAGE_LISTINGS",
  MANAGE_FINANCE: "MANAGE_FINANCE",
  MANAGE_SETTINGS: "MANAGE_SETTINGS",
  MANAGE_BLOG: "MANAGE_BLOG",
  MANAGE_STAFF: "MANAGE_STAFF",
  VIEW_ANALYTICS: "VIEW_ANALYTICS",
  MANAGE_REFERRALS: "MANAGE_REFERRALS",
  MANAGE_PRICING: "MANAGE_PRICING",
  MANAGE_MARKETING: "MANAGE_MARKETING",
  // New granular permissions
  MANAGE_REPORTS: "MANAGE_REPORTS",
  VIEW_AUDIT_LOG: "VIEW_AUDIT_LOG",
  MANAGE_KYC: "MANAGE_KYC",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const PERMISSION_LABELS: Record<Permission, string> = {
  MANAGE_USERS: "Manage Users",
  MANAGE_ESCROWS: "Manage Escrows",
  MANAGE_ESCROW_MESSAGES: "Escrow Support Messages",
  MANAGE_DISPUTES: "Manage Disputes",
  MANAGE_LISTINGS: "Manage Listings",
  MANAGE_FINANCE: "Finance & Withdrawals",
  MANAGE_SETTINGS: "Platform Settings",
  MANAGE_BLOG: "Blog & Content",
  MANAGE_STAFF: "Staff & Roles",
  VIEW_ANALYTICS: "View Analytics",
  MANAGE_REFERRALS: "Manage Referrals",
  MANAGE_PRICING: "Pricing Control",
  MANAGE_MARKETING: "Marketing Campaigns",
  MANAGE_REPORTS: "Manage Reports",
  VIEW_AUDIT_LOG: "View Audit Log",
  MANAGE_KYC: "Manage KYC Submissions",
};

export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  { label: "Users & Access", permissions: ["MANAGE_USERS", "MANAGE_STAFF", "MANAGE_KYC", "VIEW_ANALYTICS", "VIEW_AUDIT_LOG"] },
  { label: "Marketplace", permissions: ["MANAGE_LISTINGS", "MANAGE_ESCROWS", "MANAGE_ESCROW_MESSAGES", "MANAGE_DISPUTES", "MANAGE_REPORTS"] },
  { label: "Finance", permissions: ["MANAGE_FINANCE", "MANAGE_PRICING", "MANAGE_REFERRALS"] },
  { label: "Content & Settings", permissions: ["MANAGE_BLOG", "MANAGE_SETTINGS"] },
  { label: "Marketing", permissions: ["MANAGE_MARKETING"] },
];

/**
 * Role presets — apply a preset to auto-fill a sensible permission set for
 * common staff archetypes. These are suggestions only; permissions can still be
 * adjusted after applying a preset.
 */
export const STAFF_ROLE_PRESETS: {
  id: string;
  label: string;
  description: string;
  permissions: Permission[];
}[] = [
  {
    id: "SUPPORT",
    label: "Support",
    description: "Customer-facing support: users, escrow messages, reports, analytics",
    permissions: ["MANAGE_USERS", "MANAGE_ESCROW_MESSAGES", "VIEW_ANALYTICS", "MANAGE_REPORTS"],
  },
  {
    id: "MODERATOR",
    label: "Moderator",
    description: "Marketplace moderation: listings, disputes, reports, analytics",
    permissions: ["MANAGE_LISTINGS", "MANAGE_DISPUTES", "MANAGE_REPORTS", "VIEW_ANALYTICS"],
  },
  {
    id: "FINANCE",
    label: "Finance",
    description: "Finance operations and reporting only",
    permissions: ["MANAGE_FINANCE", "VIEW_ANALYTICS"],
  },
  {
    id: "FULL",
    label: "Full Access",
    description: "All permissions (equivalent to owner-level staff)",
    permissions: ALL_PERMISSIONS as unknown as Permission[],
  },
];
