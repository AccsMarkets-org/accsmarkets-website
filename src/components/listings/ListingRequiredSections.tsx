"use client";

interface ListingRequiredSectionsProps {
  listing: {
    id: string;
    platform: string;
    price: string;
    title: string;
    description: string | null;
    followersCount?: number | null;
    engagementRate?: number | null;
    monthlyRevenue?: number | null;
    accountAge?: number | null; // in days
    transferMethod?: string | null;
    monetizationEnabled?: boolean | null;
    adsenseStatus?: string | null;
    niche?: string | null;
    contentLanguage?: string | null;
  };
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

function formatAge(days: number): string {
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months !== 1 ? "s" : ""}`);
  if (parts.length === 0) return `${days} day${days !== 1 ? "s" : ""}`;
  return parts.join(" ");
}

function formatRevenue(amount: number): string {
  if (amount >= 1_000) return "$" + (amount / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return "$" + amount.toLocaleString();
}

// Platform-specific tips shown in the "Why Buy" section
const PLATFORM_TIPS: Record<string, string> = {
  YOUTUBE: "Channel in good standing with YouTube policies",
  INSTAGRAM: "Instagram account in compliance with community guidelines",
  TIKTOK: "TikTok account in compliance with TikTok guidelines",
  FACEBOOK: "Facebook Page or profile in good standing",
  TWITTER_X: "X (Twitter) account in good standing",
  TELEGRAM: "Telegram channel with active community",
  SNAPCHAT: "Snapchat account in good standing",
  PINTEREST: "Pinterest account in compliance with guidelines",
  LINKEDIN: "LinkedIn profile or page in good standing",
  WEBSITE: "Domain and website with established traffic",
};

export function ListingRequiredSections({ listing }: ListingRequiredSectionsProps) {
  const {
    platform,
    followersCount,
    engagementRate,
    monthlyRevenue,
    accountAge,
    monetizationEnabled,
    contentLanguage,
  } = listing;

  // Build "Why Buy" bullet points
  const whyBuyPoints: { icon: string; text: string }[] = [];
  if (followersCount) {
    whyBuyPoints.push({
      icon: "👥",
      text: `${formatFollowers(followersCount)} followers ready to engage with your content`,
    });
  }
  if (monthlyRevenue) {
    whyBuyPoints.push({
      icon: "💰",
      text: `Generating ${formatRevenue(monthlyRevenue)}/month in revenue`,
    });
  }
  if (monetizationEnabled) {
    whyBuyPoints.push({
      icon: "✅",
      text: "Monetization already enabled",
    });
  }
  const platformTip = PLATFORM_TIPS[platform];
  if (platformTip) {
    whyBuyPoints.push({ icon: "🛡️", text: platformTip });
  }
  whyBuyPoints.push({
    icon: "🔒",
    text: "Protected by AccsMarkets escrow — funds held until transfer verified",
  });

  // Determine monetization badge label + color
  let monetizationBadge: { label: string; cls: string } | null = null;
  if (monetizationEnabled === true) {
    monetizationBadge = { label: "ON", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" };
  } else if (monetizationEnabled === false) {
    monetizationBadge = { label: "OFF", cls: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300" };
  } else if (monetizationEnabled === null || monetizationEnabled === undefined) {
    // unknown / changeable
    monetizationBadge = null;
  }

  const hasStats =
    followersCount != null ||
    accountAge != null ||
    engagementRate != null ||
    monthlyRevenue != null ||
    monetizationEnabled != null ||
    contentLanguage != null;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Section 1: Why Buy This Account? ── */}
      <div className="rounded-2xl border border-surface-border bg-background p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Why Buy This Account?
        </h2>
        <ul className="flex flex-col gap-3">
          {whyBuyPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-sm">
                {point.icon}
              </span>
              <span className="text-sm leading-relaxed text-foreground/80">{point.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Section 2: Account Details ── */}
      {hasStats && (
        <div className="rounded-2xl border border-surface-border bg-background p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            Account Details
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {followersCount != null && (
              <StatCell
                label={platform === "YOUTUBE" ? "Subscribers" : "Followers"}
                value={formatFollowers(followersCount)}
              />
            )}
            {accountAge != null && (
              <StatCell label="Account Age" value={formatAge(accountAge)} />
            )}
            {engagementRate != null && (
              <StatCell
                label="Engagement Rate"
                value={engagementRate.toFixed(2) + "%"}
              />
            )}
            {monthlyRevenue != null && (
              <StatCell
                label="Monthly Revenue"
                value={formatRevenue(monthlyRevenue)}
              />
            )}
            {monetizationBadge && (
              <div className="flex flex-col gap-1 rounded-xl border border-surface-border bg-background/50 p-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-foreground/50">
                  Monetization
                </span>
                <span
                  className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${monetizationBadge.cls}`}
                >
                  {monetizationBadge.label}
                </span>
              </div>
            )}
            {contentLanguage && (
              <StatCell label="Content Language" value={contentLanguage} />
            )}
          </div>
        </div>
      )}

      {/* ── Section 3: Transfer Process ── */}
      <div className="rounded-2xl border border-surface-border bg-background p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">
            Transfer Process
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5"
            >
              <path
                fillRule="evenodd"
                d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                clipRule="evenodd"
              />
            </svg>
            Escrow Protected
          </span>
        </div>
        <ol className="flex flex-col gap-4">
          {[
            {
              step: 1,
              title: "Fund the escrow",
              desc: "Your payment is locked securely — neither party can access it yet.",
            },
            {
              step: 2,
              title: "Seller transfers account access",
              desc: "The seller hands over credentials or performs the platform transfer.",
            },
            {
              step: 3,
              title: "You verify the transfer",
              desc: "Confirm you have full access and everything matches the listing.",
            },
            {
              step: 4,
              title: "Funds released to seller",
              desc: "Once you confirm, the escrowed funds are released to the seller.",
            },
          ].map(({ step, title, desc }) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                {step}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs leading-relaxed text-foreground/60">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Section 4: Buyer Protection ── */}
      <div className="rounded-2xl border border-surface-border bg-background p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Buyer Protection
        </h2>
        <ul className="flex flex-col gap-3">
          {[
            { icon: "⏱️", text: "7-day dispute window after transfer" },
            { icon: "🔐", text: "Encrypted credential handover" },
            { icon: "🎧", text: "Dedicated support if anything goes wrong" },
            { icon: "💸", text: "100% funds returned if transfer fails" },
          ].map(({ icon, text }, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-sm">
                {icon}
              </span>
              <span className="text-sm text-foreground/80">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Small helper for stat grid cells
function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-surface-border bg-background/50 p-3">
      <span className="text-[11px] font-medium uppercase tracking-wider text-foreground/50">
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
