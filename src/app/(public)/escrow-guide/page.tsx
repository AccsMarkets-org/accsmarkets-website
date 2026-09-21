import Link from "next/link";
import type { Metadata } from "next";
import { FadeUp } from "@/components/ui/FadeUp";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "How Escrow Works",
  description:
    "Every AccsMarkets sale moves through a five-stage escrow — funds locked before a seller shares anything, released only after a buyer confirms access.",
  alternates: { canonical: "/escrow-guide" },
};

type Role = "Buyer" | "Seller" | "Both";

const ROLE_STYLE: Record<Role, string> = {
  Buyer: "bg-info/10 text-info",
  Seller: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
  Both: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
};

const ICON_STYLE: Record<Role, string> = {
  Buyer: "bg-info/10 text-info",
  Seller: "bg-brand-500/10 text-brand-600 dark:text-brand-400",
  Both: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

const STAGES: {
  name: string;
  who: Role;
  detail: string;
  points: string[];
  icon: React.ReactNode;
}[] = [
  {
    name: "FUNDED",
    who: "Buyer",
    detail:
      "The buyer pays price + fee from their wallet. Funds are locked with the platform — the seller can see the escrow is real before sharing anything.",
    points: [
      "Price and escrow fee are debited from the buyer's wallet in a single transaction",
      "Funds sit with the platform, not the seller — visible to both sides in the order thread immediately",
      "Still fully refundable, fee included, at this stage — see Cancelling below",
    ],
    icon: (
      <path
        fillRule="evenodd"
        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2v-7a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
        clipRule="evenodd"
      />
    ),
  },
  {
    name: "SUBMITTED",
    who: "Seller",
    detail:
      "The seller submits the account credentials and transfer details through the encrypted escrow channel. Never share credentials in DMs.",
    points: [
      "Details are sent through the encrypted escrow channel attached to the order — not through direct messages",
      "Chat is for questions, not credentials — anything shared outside escrow isn't covered if something goes wrong",
      "The order status updates the moment submission lands, so the buyer isn't left guessing",
    ],
    icon: (
      <path d="M9.47 2.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 01-1.06 1.06L10.75 4.56v7.69a.75.75 0 01-1.5 0V4.56L7.28 6.53a.75.75 0 01-1.06-1.06l3.25-3.25zM4 13a.75.75 0 01.75.75v2a.75.75 0 00.75.75h9a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0114.5 18h-9A2.25 2.25 0 013.25 15.75v-2A.75.75 0 014 13z" />
    ),
  },
  {
    name: "VERIFIED",
    who: "Buyer",
    detail:
      "The buyer logs in, checks everything matches the listing, and confirms access.",
    points: [
      "Buyer checks login, followers/subscribers, monetization status and history against what was listed",
      "Confirming happens before the transfer clock starts — mismatches get raised here, not after",
      "Anything that doesn't match is a dispute, not a support ticket",
    ],
    icon: (
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    ),
  },
  {
    name: "IN TRANSFER",
    who: "Both",
    detail:
      "Emails, recovery methods, and 2FA are moved to the buyer. For YouTube, channel ownership is transferred to the buyer's Gmail.",
    points: [
      "Recovery email, phone, and 2FA move over so the buyer has full independent control, not shared access",
      "For YouTube channels specifically, ownership transfers to the buyer's own Gmail account",
      "A live countdown tracks the transfer deadline — if the seller misses it, the buyer can open a dispute immediately",
    ],
    icon: (
      <path
        fillRule="evenodd"
        d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
        clipRule="evenodd"
      />
    ),
  },
  {
    name: "COMPLETED",
    who: "Buyer",
    detail:
      "The buyer confirms the transfer is complete. The full sale price is instantly credited to the seller's wallet, and the listing is marked sold.",
    points: [
      "Buyer confirms full, independent, working access before anything is released",
      "Seller's wallet is credited the full sale price instantly — no waiting period",
      "The listing flips to Sold and both sides can leave a review",
    ],
    icon: (
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    ),
  },
];

const SAFETY_CARDS = [
  {
    icon: "🔒",
    title: "Funds locked, not promised",
    body: "Money moves into escrow before the seller shares anything. Nobody — including AccsMarkets — releases it unilaterally.",
  },
  {
    icon: "🔐",
    title: "Encrypted handoff",
    body: "Credentials and transfer details travel through the escrow channel, not chat. It's built to be the only place they're ever shared.",
  },
  {
    icon: "⚖️",
    title: "Human-reviewed disputes",
    body: "If a stage goes wrong, either side can escalate. Our team reviews the full escrow trail — most disputes resolve within 3 business days.",
  },
];

const FAQS = [
  {
    q: "What if the seller never submits the account details?",
    a: "While the escrow is still FUNDED, the buyer can cancel at any time for a full refund — sale price and escrow fee both returned.",
  },
  {
    q: "What happens if the seller misses the transfer deadline?",
    a: "The buyer sees a live countdown during IN TRANSFER. If it expires before the handover is confirmed, the buyer can open a dispute directly from the order page.",
  },
  {
    q: "Can I lose money in escrow?",
    a: "Funds only ever move two ways from escrow: back to the buyer (cancellation, refund, or a dispute ruled in their favor) or to the seller (buyer-confirmed completion). There's no third outcome.",
  },
  {
    q: "Do I have to trust the seller before paying?",
    a: "No — that's the point of escrow. Payment is locked with the platform first, so the seller can confirm the deal is real without the buyer ever having to pay into their hands directly.",
  },
];

function StageIcon({ role, children }: { role: Role; children: React.ReactNode }) {
  return (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", ICON_STYLE[role])}>
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
        {children}
      </svg>
    </span>
  );
}

export default function EscrowGuidePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      {/* Hero */}
      <FadeUp>
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface px-3 py-1 text-xs font-semibold text-muted">
            🛡️ Buyer &amp; seller protection
          </span>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">How escrow works</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            Five stages between &ldquo;interested&rdquo; and &ldquo;paid.&rdquo; Funds are locked before a
            seller shares anything, and released only after a buyer confirms access.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/listings">
              <Button size="lg">Browse listings</Button>
            </Link>
            <Link href="/fees">
              <Button size="lg" variant="outline">
                See escrow fees
              </Button>
            </Link>
          </div>
        </div>
      </FadeUp>

      {/* Role legend */}
      <FadeUp delay={0.05}>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-muted">
          <span>Who acts at each stage:</span>
          {(["Buyer", "Seller", "Both"] as Role[]).map((role) => (
            <span key={role} className={cn("inline-flex items-center rounded-full px-2.5 py-1 font-semibold", ROLE_STYLE[role])}>
              {role}
            </span>
          ))}
        </div>
      </FadeUp>

      {/* Timeline */}
      <ol className="relative mt-10 ml-4 flex flex-col gap-8 border-l border-surface-border pl-8 sm:ml-5 sm:pl-9">
        {STAGES.map((stage, i) => (
          <FadeUp key={stage.name} delay={0.05 * i}>
            <li className="relative">
              <span className="absolute -left-[41px] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white shadow-card sm:-left-[45px]">
                {i + 1}
              </span>
              <div className="rounded-2xl border border-surface-border bg-surface p-5 shadow-card sm:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <StageIcon role={stage.who}>{stage.icon}</StageIcon>
                  <p className="font-semibold tracking-tight">{stage.name}</p>
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", ROLE_STYLE[stage.who])}>
                    acts: {stage.who}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted">{stage.detail}</p>
                <ul className="mt-4 flex flex-col gap-1.5 border-t border-surface-border pt-4">
                  {stage.points.map((point) => (
                    <li key={point} className="flex gap-2 text-sm text-foreground/80">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          </FadeUp>
        ))}
      </ol>

      {/* Cancelling & Disputes */}
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <FadeUp>
          <div className="h-full rounded-2xl border border-surface-border bg-surface p-6 shadow-card">
            <p className="mb-2 text-2xl">↩️</p>
            <h2 className="font-semibold">Cancelling</h2>
            <p className="mt-1 text-sm text-muted">
              While an escrow is still <span className="font-medium text-foreground">FUNDED</span> (the
              seller hasn&apos;t submitted anything yet), the buyer can cancel for a full refund — sale
              price and escrow fee both returned.
            </p>
          </div>
        </FadeUp>
        <FadeUp delay={0.05}>
          <div className="h-full rounded-2xl border border-surface-border bg-surface p-6 shadow-card">
            <p className="mb-2 text-2xl">⚖️</p>
            <h2 className="font-semibold">Disputes</h2>
            <p className="mt-1 text-sm text-muted">
              If something goes wrong at any later stage, either party can open a dispute. Both sides
              submit evidence, and our team reviews the full escrow trail before ruling a buyer refund
              or a seller payout — most disputes resolve within 3 business days.
            </p>
          </div>
        </FadeUp>
      </div>

      {/* Safety pillars */}
      <FadeUp>
        <h2 className="mt-16 text-center text-2xl font-bold">Why it&apos;s safe to trade here</h2>
      </FadeUp>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {SAFETY_CARDS.map((card, i) => (
          <FadeUp key={card.title} delay={0.05 * i}>
            <div className="h-full rounded-2xl border border-surface-border bg-surface p-6 shadow-card">
              <p className="mb-2 text-2xl">{card.icon}</p>
              <h3 className="font-semibold">{card.title}</h3>
              <p className="mt-1 text-sm text-muted">{card.body}</p>
            </div>
          </FadeUp>
        ))}
      </div>
      <FadeUp>
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/trust" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Read our full trust &amp; safety report →
          </Link>
        </p>
      </FadeUp>

      {/* FAQ */}
      <FadeUp>
        <h2 className="mt-16 text-2xl font-bold">Common questions</h2>
      </FadeUp>
      <div className="mt-6 flex flex-col gap-3">
        {FAQS.map((faq) => (
          <details
            key={faq.q}
            className="group rounded-2xl border border-surface-border bg-surface p-5 shadow-card open:pb-5"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
              {faq.q}
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </summary>
            <p className="mt-3 text-sm text-muted">{faq.a}</p>
          </details>
        ))}
      </div>

      {/* CTA */}
      <FadeUp>
        <div className="mt-16 flex flex-col items-center gap-4 rounded-2xl border border-surface-border bg-gradient-to-br from-brand-500/10 via-surface to-surface p-8 text-center shadow-card sm:p-12">
          <h2 className="text-2xl font-bold">Ready to trade safely?</h2>
          <p className="max-w-md text-sm text-muted">
            Browse verified listings, or list your own account and let escrow do the trust-building
            for you.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link href="/listings">
              <Button size="lg">Browse listings</Button>
            </Link>
            <Link href="/sellers">
              <Button size="lg" variant="outline">
                Start selling
              </Button>
            </Link>
          </div>
        </div>
      </FadeUp>
    </main>
  );
}
