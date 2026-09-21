import { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/ui/LegalPageLayout";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "How refunds work on AccsMarkets — escrow cancellations, refunds after credentials are submitted, dispute outcomes, crypto deposits and subscriptions.",
  alternates: { canonical: "/refunds" },
};

const SECTIONS = [
  { id: "escrow-cancel", title: "Escrow Cancellations" },
  { id: "after-credentials", title: "After Credentials Submitted" },
  { id: "disputes", title: "Dispute Outcomes" },
  { id: "deposits", title: "Crypto Deposits" },
  { id: "subscriptions", title: "Subscriptions" },
  { id: "processing", title: "Processing Times" },
];

export default function RefundsPage() {
  return (
    <LegalPageLayout
      title="Refund Policy"
      subtitle="Clear rules for refunds across escrows, deposits, and subscriptions."
      updatedAt="July 2026"
      sections={SECTIONS}
    >
      <LegalSection
        id="escrow-cancel"
        title="Escrow Cancellations (Full Refund)"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      >
        <p>
          While an escrow is in the <strong>FUNDED</strong> stage — meaning the seller has not yet submitted
          account credentials — the buyer may cancel at any time. The refund is immediate and complete:
        </p>
        <ul>
          <li>Full sale amount returned to buyer&apos;s wallet</li>
          <li>Escrow fee fully refunded</li>
          <li>No questions asked, no waiting period</li>
        </ul>
      </LegalSection>

      <LegalSection
        id="after-credentials"
        title="After Credentials Are Submitted"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
      >
        <p>
          Once the seller submits transfer details, cancellation is no longer one-sided. If the
          handover fails or the account doesn&apos;t match the listing:
        </p>
        <ul>
          <li>Open a dispute from the escrow page</li>
          <li>Provide evidence (screenshots, recordings, messages)</li>
          <li>Our team reviews and rules within 48 hours</li>
        </ul>
        <p>Funds remain safely locked in escrow until the dispute is resolved.</p>
      </LegalSection>

      <LegalSection
        id="disputes"
        title="Dispute Outcomes"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>}
      >
        <p>After review, dispute rulings result in one of:</p>
        <ul>
          <li><strong>Full buyer refund</strong> — Account didn&apos;t match, was inaccessible, or seller failed to deliver.</li>
          <li><strong>Seller payout</strong> — Buyer confirmed receipt or evidence supports successful transfer.</li>
          <li><strong>Partial resolution</strong> — In rare cases, a negotiated split may be offered to both parties.</li>
        </ul>
        <p>AccsMarkets dispute rulings are final within the platform.</p>
      </LegalSection>

      <LegalSection
        id="deposits"
        title="Crypto Deposits"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      >
        <ul>
          <li>Confirmed crypto deposits are credited to your wallet balance.</li>
          <li>Cryptocurrency transactions are irreversible by nature — we cannot reverse on-chain transfers.</li>
          <li>Wallet balances can be withdrawn at any time (minimum $20), subject to manual review.</li>
          <li>If a deposit is sent to the wrong address or network, contact support immediately — recovery is not guaranteed but we will attempt to assist.</li>
        </ul>
      </LegalSection>

      <LegalSection
        id="subscriptions"
        title="Subscriptions"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
      >
        <ul>
          <li>Subscription payments cover the current billing month and are <strong>non-refundable</strong> once activated.</li>
          <li>Cancelling stops future renewals — your plan benefits remain active until the period ends.</li>
          <li>Downgrading takes effect at the next billing cycle; no pro-rated refund for the current period.</li>
          <li>If you were charged due to a platform error, contact support for a full refund.</li>
        </ul>
      </LegalSection>

      <LegalSection
        id="processing"
        title="Processing Times"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      >
        <ul>
          <li><strong>Escrow cancellation refund:</strong> Instant (wallet credit)</li>
          <li><strong>Dispute resolution:</strong> 24–72 hours after ruling</li>
          <li><strong>Withdrawal to crypto:</strong> 1–24 hours (manual review)</li>
        </ul>
        <p>
          For refund questions, contact us at <strong>support@accsmarkets.org</strong> or use the contact form.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
