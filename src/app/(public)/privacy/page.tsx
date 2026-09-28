import { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/ui/LegalPageLayout";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How AccsMarkets collects, uses and protects your personal data — what we collect, third-party processors, security, retention and your rights.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS = [
  { id: "collect", title: "What We Collect" },
  { id: "dont", title: "What We Don't Do" },
  { id: "processors", title: "Third-Party Processors" },
  { id: "transfers", title: "International Transfers" },
  { id: "security", title: "Security Measures" },
  { id: "retention", title: "Retention & Deletion" },
  { id: "children", title: "Children's Privacy" },
  { id: "rights", title: "Your Rights" },
  { id: "contact", title: "Contact" },
];

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="How AccsMarkets collects, uses, and protects your personal data."
      updatedAt="September 2026"
      sections={SECTIONS}
    >
      <LegalSection
        id="collect"
        title="What We Collect"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>}
      >
        <ul>
          <li><strong>Account data</strong> — email, name, username, hashed password, avatar.</li>
          <li><strong>Transaction data</strong> — wallet balances, deposits, withdrawals, escrows, and their timestamps.</li>
          <li><strong>Listing & messaging content</strong> — what you post and send on the platform (auto-moderated for scams).</li>
          <li><strong>Identity verification data</strong> — where you complete KYC, the documents and OCR-extracted fields described in our <strong>KYC Policy</strong>.</li>
          <li><strong>Technical data</strong> — IP address (rate limiting, fraud prevention), session tokens, browser type.</li>
        </ul>
      </LegalSection>

      <LegalSection
        id="dont"
        title="What We Don't Do"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
      >
        <ul>
          <li>We <strong>don&apos;t sell</strong> your data to anyone — ever.</li>
          <li>We <strong>don&apos;t store</strong> plaintext passwords (bcrypt) or plaintext escrow credentials (AES-256-GCM encrypted).</li>
          <li>We <strong>don&apos;t read</strong> your DMs except via automated scam-pattern moderation or during dispute review.</li>
          <li>We <strong>don&apos;t share</strong> your account data, wallet activity, or escrow details with advertisers. We do use Google Analytics, Google AdSense and the Meta Pixel on public pages for usage measurement and advertising — see our <a href="/cookies">Cookie Policy</a> for details and how to opt out.</li>
        </ul>
      </LegalSection>

      <LegalSection
        id="processors"
        title="Third-Party Processors"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
      >
        <p>We share the minimum data necessary with these processors:</p>
        <ul>
          <li><strong>NOWPayments</strong> — Crypto payment processing (wallet addresses, transaction amounts).</li>
          <li><strong>Cloudinary</strong> — Image and document hosting (uploaded listing images and encrypted KYC document files).</li>
          <li><strong>Brevo</strong> — Transactional email delivery (email address and message content, e.g. escrow and verification notifications).</li>
          <li><strong>Google OAuth</strong> — Authentication (email and profile name for login).</li>
          <li><strong>OpenAI and/or Google Gemini</strong> — Vision-capable AI models used only to assist human review of submitted KYC documents (OCR-style field extraction and image-quality/tamper checks) as described in our KYC Policy. These providers receive only the specific document images needed for that single check, never a bulk export.</li>
        </ul>
        <p>Each processor receives only the minimum data needed for its function. We do not share browsing behavior, messages, or financial history with any third party.</p>
      </LegalSection>

      <LegalSection
        id="transfers"
        title="International Transfers"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2 2 2 0 012 2v1a2 2 0 002 2h1.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      >
        <p>
          Several of the processors listed above — including Cloudinary, Brevo, our AI-assisted KYC review providers,
          and NOWPayments — operate infrastructure in the United States or other countries outside your own. If you
          are located outside those countries, using AccsMarkets means your personal data (including account,
          transaction, and where applicable KYC data) may be transferred to, stored, and processed in a country
          whose data-protection laws differ from those where you live.
        </p>
        <p>
          We select processors that maintain appropriate security and confidentiality commitments, and we rely on
          contractual safeguards (such as standard contractual clauses, where applicable) to protect data that
          crosses borders in this way.
        </p>
      </LegalSection>

      <LegalSection
        id="security"
        title="Security Measures"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
      >
        <ul>
          <li>Passwords are hashed with <strong>bcrypt</strong> (cost factor 12).</li>
          <li>Escrow credentials and KYC document references are encrypted with <strong>AES-256-GCM</strong> at rest.</li>
          <li>All connections use <strong>HTTPS/TLS</strong>.</li>
          <li>Session tokens are <strong>HttpOnly</strong>, <strong>Secure</strong>, and <strong>SameSite</strong>.</li>
          <li>Rate limiting and automated fraud detection on all sensitive endpoints.</li>
        </ul>
      </LegalSection>

      <LegalSection
        id="retention"
        title="Retention & Deletion"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
      >
        <p>Retention periods vary by data category:</p>
        <ul>
          <li><strong>KYC identity documents</strong> — a minimum of 5 years from submission, or 5 years after account closure, whichever is later, as required by AML law. See our KYC Policy for details.</li>
          <li><strong>Transaction and financial records</strong> (deposits, withdrawals, escrows) — retained for a minimum of 5 years for accounting, tax, and fraud-prevention purposes.</li>
          <li><strong>Listing and chat messages</strong> — retained for as long as your account is active so we can moderate for scams and assist with disputes; messages tied to a completed dispute or a flagged conversation are retained under the same 5-year schedule as the related transaction record.</li>
          <li><strong>Account data</strong> (profile, settings) — retained while your account is active.</li>
          <li><strong>Technical/security logs</strong> (IP addresses, device fingerprints) — retained only as long as needed for rate-limiting and fraud-detection purposes, then deleted or aggregated.</li>
        </ul>
        <p>
          You may request full account deletion at any time. Upon deletion, non-financial personal data is removed
          or anonymized within 30 days; data subject to one of the legal retention periods above (financial records,
          KYC documents, dispute-related messages) is retained only for that period and is not used for any other
          purpose in the meantime.
        </p>
      </LegalSection>

      <LegalSection
        id="children"
        title="Children's Privacy"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
      >
        <p>
          AccsMarkets is not directed at, and is not intended for use by, anyone under 18 years old — our Terms of
          Service require all users to be at least 18. We do not knowingly collect personal data from anyone under
          18. If we learn that we have collected personal data from someone under 18, we will delete the associated
          account and data as soon as reasonably possible. If you believe a minor has created an account, please
          contact us using the details below.
        </p>
      </LegalSection>

      <LegalSection
        id="rights"
        title="Your Rights"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
      >
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <ul>
          <li><strong>Access</strong> — Request a copy of all personal data we hold about you.</li>
          <li><strong>Rectification</strong> — Correct inaccurate personal data.</li>
          <li><strong>Erasure</strong> — Request deletion of your account and associated data, subject to the legal retention periods above.</li>
          <li><strong>Restriction</strong> — Ask us to limit processing of your data while a dispute or a rights request is resolved.</li>
          <li><strong>Portability</strong> — Receive your data in a machine-readable format.</li>
          <li><strong>Objection</strong> — Object to processing for specific purposes.</li>
          <li><strong>Withdraw consent</strong> — Where we rely on your consent (for example, non-essential cookies), withdraw it at any time without affecting the lawfulness of processing carried out before withdrawal.</li>
        </ul>
        <p>
          You can start most of these requests from{" "}
          <a href="/dashboard/settings" className="text-brand-500 underline hover:text-brand-400">Settings → Privacy</a>{" "}
          in your account, or by contacting us directly. We may need to verify your identity before actioning a
          request that involves sensitive account or financial data.
        </p>
      </LegalSection>

      <LegalSection
        id="contact"
        title="Contact"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
      >
        <p>For privacy questions, data requests, or concerns:</p>
        <ul>
          <li>Email: <strong>privacy@accsmarkets.org</strong></li>
          <li>Use the contact form on our website</li>
        </ul>
        <p>We respond to all data subject requests within 30 days.</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
