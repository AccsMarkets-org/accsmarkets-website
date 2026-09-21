// Server Component — no "use client"
// Accepts live stats fetched by the parent Server Component page.

export interface TrustStats {
  escrowVolume: number;
  completedEscrows: number;
  avgRating: number;
  activeListings: number;
}

interface Props {
  stats: TrustStats;
  /** "login" panel copy vs "register" panel copy */
  variant?: "login" | "register";
}

function formatVolume(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const TRUST_BADGES = [
  {
    label: "Escrow Protected",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: "Verified Sellers",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    label: "Buyer Protection",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
      </svg>
    ),
  },
];

export default function TrustPanelServer({ stats, variant = "login" }: Props) {
  const heading =
    variant === "register"
      ? "Join 10,000+ buyers & sellers."
      : "The safest place to buy & sell social accounts.";

  const subtext =
    variant === "register"
      ? "Every sale is backed by our escrow system — funds are held securely until you confirm the account is yours."
      : "Every transaction is protected by our escrow system. Funds are only released when you confirm the account transfer is complete.";

  const statsDisplay = [
    {
      value: stats.escrowVolume > 0 ? `$${formatVolume(stats.escrowVolume)}+` : "$2.4M+",
      label: "through escrow",
    },
    {
      value: stats.completedEscrows > 0 ? `${stats.completedEscrows.toLocaleString()}+` : "3,200+",
      label: "transfers",
    },
    {
      value:
        stats.avgRating > 0
          ? `${stats.avgRating.toFixed(1)}★`
          : "4.9★",
      label: "avg rating",
    },
  ];

  return (
    <div className="hidden lg:flex lg:w-[480px] flex-col justify-between bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 p-10 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -left-10 bottom-20 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
      </div>
      <div className="relative">
        <div className="flex items-center gap-2 mb-10">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-sm font-black backdrop-blur-sm">
            A
          </span>
          <span className="text-xl font-bold">AccsMarkets</span>
        </div>
        <h2 className="text-3xl font-bold leading-tight">{heading}</h2>
        <p className="mt-4 text-white/70 text-sm leading-relaxed">{subtext}</p>

        <div className="mt-10 flex flex-wrap gap-2">
          {["YouTube", "Instagram", "TikTok", "Telegram", "Facebook", "Twitter/X"].map((p) => (
            <span
              key={p}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-sm border border-white/10"
            >
              {p}
            </span>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-3 gap-4">
          {statsDisplay.map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-white/60 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex gap-5 pt-8 border-t border-white/15">
        {TRUST_BADGES.map((b) => (
          <div key={b.label} className="flex items-center gap-1.5 text-xs text-white/80">
            {b.icon}
            <span>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
