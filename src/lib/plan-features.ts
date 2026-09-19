export interface PlanFeatureRow {
  label: string;
  free: string | boolean;
  starter: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
}

export const PLAN_FEATURES_TABLE: PlanFeatureRow[] = [
  { label: "Active listings",       free: "5",       starter: "20",       pro: "75",       enterprise: "Unlimited" },
  { label: "Escrow fee",            free: "5%",      starter: "4%",       pro: "3%",       enterprise: "2%" },
  { label: "Min escrow fee",        free: "$4",      starter: "$3",       pro: "$2",       enterprise: "$1" },
  { label: "Featured listings",     free: false,     starter: "1/mo",     pro: "3/mo",     enterprise: "10/mo" },
  { label: "Listing bumps",         free: false,     starter: "3/mo",     pro: "10/mo",    enterprise: "Unlimited" },
  { label: "Analytics access",      free: "Basic",   starter: "Standard", pro: "Advanced", enterprise: "Full" },
  { label: "Priority support",      free: false,     starter: false,      pro: true,       enterprise: true },
  { label: "Verified seller badge", free: false,     starter: false,      pro: true,       enterprise: true },
  { label: "API access",            free: false,     starter: false,      pro: false,      enterprise: true },
  { label: "Team members",          free: "1",       starter: "1",        pro: "3",        enterprise: "10" },
  { label: "Custom profile URL",    free: false,     starter: true,       pro: true,       enterprise: true },
  { label: "Early access features", free: false,     starter: false,      pro: false,      enterprise: true },
];

export const PLAN_BULLET_FEATURES: Record<string, string[]> = {
  FREE: [
    "Up to 5 active listings",
    "5% escrow fee per sale",
    "Basic analytics",
    "Community support",
    "Standard listing visibility",
  ],
  STARTER: [
    "Up to 20 active listings",
    "4% escrow fee per sale",
    "Enhanced analytics",
    "Priority support",
    "1 featured listing/mo",
    "3 listing bumps/mo",
  ],
  PRO: [
    "Up to 75 active listings",
    "3% escrow fee per sale",
    "Advanced analytics & reports",
    "Dedicated support",
    "3 featured listings/mo",
    "10 listing bumps/mo",
    "Verified seller badge",
    "Up to 3 team members",
  ],
  ENTERPRISE: [
    "Unlimited active listings",
    "2% escrow fee per sale",
    "Full analytics suite",
    "Personal account manager",
    "10 featured listings/mo",
    "Unlimited listing bumps",
    "Full API access",
    "Up to 10 team members",
    "Custom contract terms",
  ],
};

export const PLAN_META: Record<string, { tagline: string; popular?: boolean }> = {
  FREE: { tagline: "Get started for free" },
  STARTER: { tagline: "For growing sellers" },
  PRO: { tagline: "For power sellers", popular: true },
  ENTERPRISE: { tagline: "For agencies & brokers" },
};
