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
};

export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  { label: "Users & Access", permissions: ["MANAGE_USERS", "MANAGE_STAFF", "VIEW_ANALYTICS"] },
  { label: "Marketplace", permissions: ["MANAGE_LISTINGS", "MANAGE_ESCROWS", "MANAGE_ESCROW_MESSAGES", "MANAGE_DISPUTES"] },
  { label: "Finance", permissions: ["MANAGE_FINANCE", "MANAGE_PRICING", "MANAGE_REFERRALS"] },
  { label: "Content & Settings", permissions: ["MANAGE_BLOG", "MANAGE_SETTINGS"] },
  { label: "Marketing", permissions: ["MANAGE_MARKETING"] },
];
