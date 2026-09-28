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
  { id: "prohibited", title: "Prohibited Items & Conduct" },
  { id: "escrow", title: "Escrow & Payments" },
  { id: "disputes", title: "Dispute Resolution" },
  { id: "suspension", title: "Suspension & Termination" },
  { id: "third-party", title: "Third-Party Policies" },
  { id: "referrals", title: "Referral Program" },
  { id: "api", title: "API Usage" },
  { id: "ip", title: "Intellectual Property" },
  { id: "liability", title: "Liability" },
  { id: "indemnification", title: "Indemnification" },
  { id: "governing-law", title: "Governing Law" },
  { id: "changes", title: "Changes" },
];

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" subtitle="Please read these terms carefully before using AccsMarkets." updatedAt="September 2026 (v3.0)" sections={SECTIONS}>
      <LegalSection id="service" title="1. The Service" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>}>
        <p>AccsMarkets provides an escrow and marketplace service for the transfer of social media accounts and websites between users. We are an intermediary: we hold funds, facilitate handovers, and arbitrate disputes. We are not a party to the underlying sale, and we do not manufacture, verify pre-sale, or guarantee the underlying account itself except as expressly stated in this document.</p>
      </LegalSection>

      <LegalSection id="eligibility" title="2. Eligibility & Accounts" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}>
        <ul>
          <li>You must be at least 18 years old and able to form a binding contract. By creating an account you represent and warrant that you meet this requirement and that you are not barred from using the Service under the laws of your country of residence.</li>
          <li>One account per person. Email verification is mandatory before any platform activity. Creating or controlling multiple accounts to evade a suspension, bypass listing limits, manipulate trust scores or reviews, or abuse referral rewards is a violation of these Terms (see Section 4).</li>
          <li>You are responsible for safeguarding your credentials and enabling available security features. You must notify us immediately if you suspect unauthorized access to your account.</li>
          <li>Accounts with elevated verification (Phone, ID) gain access to higher transaction limits and platform features — see our <strong>KYC Policy</strong> for the exact requirements gated behind each level.</li>
          <li>We may refuse to open, or may suspend, an account at our discretion where required for legal, compliance, or risk-management reasons.</li>
        </ul>
      </LegalSection>

      <LegalSection id="listings" title="3. Listings & Conduct" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}>
        <ul>
          <li>You may only list accounts you own and control. Ownership verification may be required.</li>
          <li>Misrepresenting metrics, monetization status, or account history is grounds for removal and bans.</li>
          <li>Attempting to move deals off-platform to avoid escrow is prohibited and enforced by automated moderation.</li>
          <li>Listing limits are determined by your subscription plan (Free: 5, Starter: 20, Pro: 75, Enterprise: Unlimited).</li>
          <li>Listing content (titles, descriptions, screenshots, analytics images) must be accurate and must not infringe a third party's rights — see Section 11 (Intellectual Property).</li>
        </ul>
      </LegalSection>

      <LegalSection id="prohibited" title="4. Prohibited Items & Conduct" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}>
        <p>The following items are strictly banned from the platform:</p>
        <ul>
          <li>Stolen, hacked, phished, credential-stuffed, or otherwise fraudulently obtained accounts.</li>
          <li>Accounts acquired through methods that violate the underlying platform's own Terms of Service — for example, purchased followers or fake engagement, automation- or bot-created accounts misrepresented as organic, or accounts obtained via account-farming schemes.</li>
          <li>Any account, listing, or content that contains, promotes, links to, or facilitates access to child sexual abuse material (CSAM) or any sexualization of minors. We have zero tolerance for this: affected accounts are permanently banned immediately, all related evidence is preserved, and we report to the National Center for Missing &amp; Exploited Children (NCMEC) and/or law enforcement as required by law.</li>
          <li>Accounts containing other illegal content, or content promoting violence, terrorism, or hate.</li>
          <li>Accounts under active legal disputes, government holds, or known to be reported stolen to the host platform.</li>
        </ul>
        <p className="mt-3">The following conduct is also prohibited and may result in listing removal, escrow forfeiture, and/or account suspension or termination under Section 7:</p>
        <ul>
          <li><strong>Fraud and misrepresentation</strong> — providing false information about a listing, your identity, KYC documents, or a transaction.</li>
          <li><strong>Ban evasion</strong> — creating a new account, or using another person's account, after a suspension or termination.</li>
          <li><strong>Multi-accounting</strong> — operating more than one account to bypass listing limits, manipulate trust scores or reviews, or claim referral rewards multiple times.</li>
          <li><strong>Escrow circumvention</strong> — soliciting or agreeing to complete a listed transaction outside of AccsMarkets escrow.</li>
          <li><strong>Harassment, threats, or impersonation</strong> of another user, staff member, or the platform itself.</li>
          <li><strong>Chargeback or payment fraud</strong>, including disputing a legitimate crypto deposit or bank transfer after receiving platform credit or a completed escrow.</li>
        </ul>
      </LegalSection>

      <LegalSection id="escrow" title="5. Escrow & Payments" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
        <ul>
          <li>Buyers fund escrows from their wallet balance. Fees are displayed before confirmation and vary by seller plan (2–5%).</li>
          <li>Sellers receive 100% of the listing price when the escrow completes successfully.</li>
          <li>Buyers may cancel while the escrow is in the <strong>FUNDED</strong> or <strong>AWAITING_MANAGER_ADD</strong> stage — i.e. before the seller has submitted account credentials for verification — for a full refund including fees.</li>
          <li>After credential submission, cancellation requires a dispute process; funds stay locked in escrow until it resolves.</li>
          <li>Certain escrows — including high-value transactions above the platform's high-value threshold, or specific host platforms with their own transfer policy — may require additional safeguards such as a transfer-manager handover step or video verification before funds are released.</li>
          <li>Support staff may access escrow communications to assist with handover issues or to investigate a dispute.</li>
        </ul>
      </LegalSection>

      <LegalSection id="disputes" title="6. Dispute Resolution" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>}>
        <p>Disputes follow a structured multi-phase process:</p>
        <ul>
          <li><strong>Evidence Phase (72 hours)</strong> — Both parties submit evidence and statements.</li>
          <li><strong>Review Phase</strong> — Our team examines all evidence and may request additional information.</li>
          <li><strong>Mediation Phase</strong> — When appropriate, a settlement proposal may be offered to both parties.</li>
          <li><strong>Ruling Phase</strong> — A final decision is issued with full reasoning.</li>
          <li><strong>Appeal Window (24 hours)</strong> — Either party may request a senior review of the ruling.</li>
        </ul>
        <p>
          AccsMarkets acts as the final arbiter of disputes conducted through our escrow. By funding or accepting an
          escrow, both parties agree that our ruling — including any decision to release funds to the buyer, to the
          seller, or to split them — is binding on the platform, and that they will exhaust this internal process in
          good faith before pursuing a claim elsewhere. The appeal window provides a senior-level review of process
          or evidence; it is not an unlimited right to re-litigate a ruling. Nothing in this section limits any
          non-waivable right you may have under applicable consumer-protection law.
        </p>
      </LegalSection>

      <LegalSection id="suspension" title="7. Suspension & Termination" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" /></svg>}>
        <p>We may suspend or terminate your account, listings, or access to specific features (such as withdrawals) where we reasonably believe:</p>
        <ul>
          <li>You have violated these Terms, our Prohibited Items &amp; Conduct rules (Section 4), our KYC Policy, or our AML Policy;</li>
          <li>You submitted false, forged, or materially misleading KYC information;</li>
          <li>Your account is linked to chargeback abuse, payment fraud, or a security compromise;</li>
          <li>Your activity has triggered an elevated risk or fraud score, pending further review — in this case a withdrawal or transaction may be held rather than immediately declined, as described in our AML Policy;</li>
          <li>We are required to do so by law, by a court order, or by a request from a payment or KYC processor we rely on; or</li>
          <li>Action is necessary, in our reasonable judgment, to protect the platform, other users, or AccsMarkets itself.</li>
        </ul>
        <p>
          While an account is suspended, active listings are removed from public view and pending escrows continue
          to be governed by the dispute process in Section 6 rather than cancelled automatically. A wallet balance
          under investigation may be held pending the outcome of that review. You may appeal a suspension or
          termination through support; we are not obligated to reinstate an account, but we will explain the basis
          for our decision where we are able to.
        </p>
      </LegalSection>

      <LegalSection id="third-party" title="8. Third-Party Platform Policies" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}>
        <p>Social networks may prohibit or restrict account transfers in their own terms. You are responsible for understanding and accepting that risk.</p>
        <p>
          AccsMarkets makes <strong>no warranty, express or implied</strong>, regarding the continued availability,
          standing, monetization eligibility, or compliance status of any account with its host platform (for
          example YouTube, Instagram, TikTok, X/Twitter, Meta, or Google) once a transfer completes. Host platforms
          may suspend, terminate, demonetize, or restrict an account at any time for reasons entirely outside our
          control — including the change of ownership itself. We are not liable for any loss arising from a host
          platform's own enforcement action taken after a successful, as-described transfer.
        </p>
      </LegalSection>

      <LegalSection id="referrals" title="9. Referral Program" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}>
        <ul>
          <li>Each user receives a unique referral code upon registration.</li>
          <li>For every 10 users who register with your referral code, you earn a $10 milestone bonus.</li>
          <li>Milestones are cumulative: 10 referrals = $10, 20 = $20, 30 = $30, etc.</li>
          <li>Self-referrals, fake accounts, or abuse of the referral system results in forfeiture of all rewards and possible ban.</li>
          <li>AccsMarkets reserves the right to modify the referral program terms at any time.</li>
        </ul>
      </LegalSection>

      <LegalSection id="api" title="10. API Usage" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}>
        <ul>
          <li>API access is available to Enterprise plan subscribers.</li>
          <li>Rate limits apply: Standard 60 requests/minute, Enterprise 300 requests/minute.</li>
          <li>API keys must be kept secret. Compromised keys should be revoked immediately.</li>
          <li>Automated bulk listing creation, scraping, or abuse of API endpoints results in key revocation.</li>
          <li>We reserve the right to throttle or suspend API access for any reason.</li>
        </ul>
      </LegalSection>

      <LegalSection id="ip" title="11. Intellectual Property" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}>
        <ul>
          <li>The AccsMarkets name, logo, and platform design are our intellectual property and may not be used without permission.</li>
          <li>You retain ownership of the descriptive content (text, screenshots, analytics images) you upload to create a listing, but you grant AccsMarkets a non-exclusive, royalty-free, worldwide license to host, display, reproduce, and syndicate that content for the purpose of operating and promoting the marketplace, including search indexing and social sharing.</li>
          <li>You represent that you own or have the rights to any content you upload, and that it does not infringe a third party's intellectual property, privacy, or publicity rights.</li>
          <li>We will remove listing content in response to a valid, good-faith infringement notice and may take action against repeat infringers under Section 7.</li>
        </ul>
      </LegalSection>

      <LegalSection id="liability" title="12. Limitation of Liability" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}>
        <p>
          The service is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind,
          express or implied, including any implied warranty of merchantability, fitness for a particular purpose,
          or non-infringement. As set out in Section 8, we make no warranty about the post-transfer stability of any
          account with its host platform.
        </p>
        <p>
          To the maximum extent permitted by law, AccsMarkets is not liable for any indirect, incidental, special,
          consequential, or punitive damages, or for lost profits, lost data, or loss of goodwill, arising out of
          your use of the Service. Our aggregate liability for any claim is limited to the fees you paid us in the
          prior 12 months. Nothing in this section excludes liability that cannot be excluded under applicable law,
          including liability for our own fraud or willful misconduct.
        </p>
      </LegalSection>

      <LegalSection id="indemnification" title="13. Indemnification" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}>
        <p>
          You agree to indemnify, defend, and hold harmless AccsMarkets and its officers, employees, and agents from
          any claim, demand, loss, or liability (including reasonable legal fees) arising out of: (a) a listing you
          created or an account you bought or sold through the Service; (b) your violation of these Terms or of a
          third-party platform's own terms of service; (c) your violation of any law or the rights of a third party;
          or (d) content you submit to the Service.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" title="14. Governing Law & Arbitration" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M12 7a5 5 0 100 10 5 5 0 000-10z" /></svg>}>
        <p>
          <strong>Placeholder — no jurisdiction has been designated yet.</strong> AccsMarkets has not yet formally
          adopted a specific governing-law or arbitration-venue clause for these Terms, and we are not going to
          invent one here. Until a definitive clause is published in this section, disputes that cannot be resolved
          through our internal Dispute Resolution process (Section 6) remain subject to the mandatory
          consumer-protection and contract laws that otherwise apply in your country or state of residence. We will
          update this section with a specific governing-law and arbitration clause and will notify users in
          accordance with Section 15 (Changes) before it takes effect.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="15. Changes" icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}>
        <p>We may update these terms at any time. When we do, we&apos;ll increment the version number and notify you via an in-app acceptance gate. Continued use after accepting updated terms constitutes agreement. Material changes affecting your rights (such as new fee structures, arbitration terms, or restrictions on prohibited conduct) will be highlighted at the top of the acceptance gate rather than buried in a version bump.</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
