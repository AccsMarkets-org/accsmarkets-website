import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 86400;
export const metadata: Metadata = {
  title: "Security — AccsMarkets",
  description: "How AccsMarkets protects your account, credentials, and transactions.",
};

type Category = {
  label: string;
  items: { title: string; body: string; icon: React.ReactNode }[];
};

const CATEGORIES: Category[] = [
  {
    label: "Account protection",
    items: [
      {
        title: "Two-factor authentication",
        body: "Enable 2FA in your security settings to protect your account with a time-based one-time password (TOTP). All admin accounts require it.",
        icon: (
          <path
            fillRule="evenodd"
            d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2v-7a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
            clipRule="evenodd"
          />
        ),
      },
      {
        title: "Session management",
        body: "Active sessions are tracked per device and can be revoked individually from Settings → Sessions. Sessions expire automatically after 30 days of inactivity.",
        icon: (
          <path
            fillRule="evenodd"
            d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2h-4l.24 1.2a1 1 0 01-.98 1.2H8.74a1 1 0 01-.98-1.2L8 17H4a2 2 0 01-2-2V5zm14 0H4v10h12V5z"
            clipRule="evenodd"
          />
        ),
      },
      {
        title: "Device fingerprinting & risk scoring",
        body: "Logins from a new device or an unusual pattern are flagged automatically. High-risk accounts get additional review before sensitive actions.",
        icon: <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />,
      },
    ],
  },
  {
    label: "Data & transfer security",
    items: [
      {
        title: "Encrypted credentials",
        body: "Account credentials shared during a transfer are encrypted at rest and only ever accessible to the intended recipient and our escrow system — never in chat, never in plaintext.",
        icon: (
          <path
            fillRule="evenodd"
            d="M18 8a2 2 0 00-2-2h-1V4a5 5 0 00-10 0v2H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V8zM7 4a3 3 0 016 0v2H7V4zm3 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        ),
      },
      {
        title: "KYC identity verification",
        body: "Identity verification uses liveness detection and document authentication. Verified sellers carry a visible badge and have a measurably lower dispute rate.",
        icon: (
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
          />
        ),
      },
    ],
  },
  {
    label: "Platform safeguards",
    items: [
      {
        title: "Rate limiting & brute-force protection",
        body: "Login, registration, and sensitive API endpoints are rate-limited per IP. Repeated failed login attempts trigger a temporary lockout.",
        icon: (
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
          />
        ),
      },
      {
        title: "Responsible disclosure",
        body: "Found a security issue? Email us with details — we investigate every report promptly and credit researchers who help us improve.",
        icon: (
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
        ),
      },
    ],
  },
];

function CategoryIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
        {children}
      </svg>
    </span>
  );
}

export default function SecurityPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      {/* Hero */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface px-3 py-1 text-xs font-semibold text-muted">
          🔐 Security
        </span>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">How we keep you safe</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
          Account protection, encrypted handoffs, and platform-level safeguards — layered so no single
          point of failure puts your funds or your account at risk.
        </p>
      </div>

      {/* Categories */}
      <div className="mt-14 flex flex-col gap-12">
        {CATEGORIES.map((category) => (
          <div key={category.label}>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">{category.label}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {category.items.map((item) => (
                <div key={item.title} className="rounded-2xl border border-surface-border bg-surface p-5 shadow-card">
                  <div className="flex items-center gap-3">
                    <CategoryIcon>{item.icon}</CategoryIcon>
                    <h3 className="font-semibold">{item.title}</h3>
                  </div>
                  <p className="mt-3 text-sm text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Disclosure CTA */}
      <div className="mt-16 flex flex-col items-center gap-3 rounded-2xl border border-surface-border bg-gradient-to-br from-brand-500/10 via-surface to-surface p-8 text-center shadow-card sm:p-10">
        <h2 className="text-xl font-bold">Found a security issue?</h2>
        <p className="max-w-md text-sm text-muted">
          We take reports seriously and investigate every one. Responsible disclosure is credited, not
          punished.
        </p>
        <a
          href="mailto:security@accsmarkets.org"
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          security@accsmarkets.org
        </a>
        <Link href="/contact" className="text-xs font-medium text-muted hover:text-foreground hover:underline">
          or use the contact form →
        </Link>
      </div>
    </main>
  );
}
