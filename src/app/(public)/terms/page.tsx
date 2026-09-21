import { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/ui/LegalPageLayout";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of AccsMarkets: eligibility, listings and conduct, escrow and payments, dispute resolution, prohibited items and liability.",
  alternates: { canonical: "/terms" },
};

const SECTIONS = [
  { id: "service", title: "The Service" },
  { id: "eligibility", title: "Eligibility & Accounts" },
  { id: "listings", title: "Listings & Conduct" },
  { id: "escrow", title: "Escrow & Payments" },
  { id: "disputes", title: "Dispute Resolution" },
  { id: "third-party", title: "Third-Party Policies" },
  { id: "prohibited", title: "Prohibited Items" },
  { id: "referrals", title: "Referral Program" },
  { id: "api", title: "API Usage" },
  { id: "liability", title: "Liability" },
  { id: "changes", title: "Changes" },
];

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" subtitle="Please read these terms carefully before using AccsMarkets." updatedAt="July 2026 (v2.5)" sections={SECTIONS}>
      <LegalSection id="service" title="1. The Service" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>}>
        <p>AccsMarkets provides an escrow and marketplace service for the transfer of social media accounts and websites between users. We are an intermediary: we hold funds, facilitate handovers, and arbitrate disputes. We are not a party to the underlying sale.</p>
      </LegalSection>

      <LegalSection id="eligibility" title="2. Eligibility & Accounts" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}>
        <ul>
          <li>You must be at least 18 years old and able to form a binding contract.</li>
          <li>One account per person. Email verification is mandatory before any platform activity.</li>
          <li>You are responsible for safeguarding your credentials and enabling available security features.</li>
          <li>Accounts with elevated verification (Phone, ID) gain access to higher transaction limits.</li>
        </ul>
      </LegalSection>

      <LegalSection id="listings" title="3. Listings & Conduct" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}>
        <ul>
          <li>You may only list accounts you own and control. Ownership verification may be required.</li>
          <li>Misrepresenting metrics, monetization status, or account history is grounds for removal and bans.</li>
          <li>Attempting to move deals off-platform to avoid escrow is prohibited and enforced by automated moderation.</li>
          <li>Listing limits are determined by your subscription plan (Free: 5, Starter: 20, Pro: 75, Enterprise: Unlimited).</li>
        </ul>
      </LegalSection>

      <LegalSection id="escrow" title="4. Escrow & Payments" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
        <ul>
          <li>Buyers fund escrows from their wallet balance. Fees are displayed before confirmation and vary by seller plan (2–5%).</li>
          <li>Sellers receive 100% of the listing price when the escrow completes successfully.</li>
          <li>Buyers may cancel during the FUNDED stage for a full refund including fees.</li>
          <li>After credential submission, cancellation requires a dispute process.</li>
          <li>Support staff may access escrow communications to assist with handover issues.</li>
        </ul>
      </LegalSection>

      <LegalSection id="disputes" title="5. Dispute Resolution" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>}>
        <p>Disputes follow a structured multi-phase process:</p>
        <ul>
          <li><strong>Evidence Phase (72 hours)</strong> — Both parties submit evidence and statements.</li>
          <li><strong>Review Phase</strong> — Our team examines all evidence and may request additional information.</li>
          <li><strong>Mediation Phase</strong> — When appropriate, a settlement proposal may be offered to both parties.</li>
          <li><strong>Ruling Phase</strong> — A final decision is issued with full reasoning.</li>
          <li><strong>Appeal Window (24 hours)</strong> — Either party may request a senior review of the ruling.</li>
        </ul>
        <p>Dispute rulings by AccsMarkets are final within the platform after the appeal window closes.</p>
      </LegalSection>

      <LegalSection id="third-party" title="6. Third-Party Platform Policies" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}>
        <p>Social networks may prohibit or restrict account transfers in their own terms. You are responsible for understanding and accepting that risk. AccsMarkets does not guarantee the post-transfer standing of any account with its host platform.</p>
      </LegalSection>

      <LegalSection id="prohibited" title="7. Prohibited Items" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}>
        <p>The following are strictly banned from the platform:</p>
        <ul>
          <li>Stolen, hacked, or fraudulently obtained accounts</li>
          <li>Accounts containing illegal content or promoting violence</li>
          <li>Botted or fake-engagement accounts misrepresented as organic</li>
          <li>Accounts under active legal disputes or government holds</li>
        </ul>
      </LegalSection>

      <LegalSection id="referrals" title="8. Referral Program" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}>
        <ul>
          <li>Each user receives a unique referral code upon registration.</li>
          <li>For every 10 users who register with your referral code, you earn a $10 milestone bonus.</li>
          <li>Milestones are cumulative: 10 referrals = $10, 20 = $20, 30 = $30, etc.</li>
          <li>Self-referrals, fake accounts, or abuse of the referral system results in forfeiture of all rewards and possible ban.</li>
          <li>AccsMarkets reserves the right to modify the referral program terms at any time.</li>
        </ul>
      </LegalSection>

      <LegalSection id="api" title="9. API Usage" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}>
        <ul>
          <li>API access is available to Enterprise plan subscribers.</li>
          <li>Rate limits apply: Standard 60 requests/minute, Enterprise 300 requests/minute.</li>
          <li>API keys must be kept secret. Compromised keys should be revoked immediately.</li>
          <li>Automated bulk listing creation, scraping, or abuse of API endpoints results in key revocation.</li>
          <li>We reserve the right to throttle or suspend API access for any reason.</li>
        </ul>
      </LegalSection>

      <LegalSection id="liability" title="10. Liability" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}>
        <p>The service is provided &quot;as is&quot;. To the maximum extent permitted by law, our aggregate liability for any claim is limited to the fees you paid us in the prior 12 months.</p>
      </LegalSection>

      <LegalSection id="changes" title="11. Changes" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}>
        <p>We may update these terms at any time. When we do, we&apos;ll increment the version number and notify you via an in-app acceptance gate. Continued use after accepting updated terms constitutes agreement.</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
