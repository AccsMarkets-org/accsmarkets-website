import { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/ui/LegalPageLayout";

export const revalidate = 86400;

export const metadata: Metadata = { title: "Privacy Policy — AccsMarkets", description: "How we collect, use, and protect your personal data." };

const SECTIONS = [
  { id: "collect", title: "What We Collect" },
  { id: "dont", title: "What We Don't Do" },
  { id: "processors", title: "Third-Party Processors" },
  { id: "security", title: "Security Measures" },
  { id: "retention", title: "Retention & Deletion" },
  { id: "rights", title: "Your Rights" },
  { id: "contact", title: "Contact" },
];

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="How AccsMarkets collects, uses, and protects your personal data."
      updatedAt="July 2026"
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
          <li><strong>Cloudinary</strong> — Image hosting (uploaded listing images only).</li>
          <li><strong>SMTP provider</strong> — Email delivery (email addresses for transactional emails).</li>
          <li><strong>Google OAuth</strong> — Authentication (email and profile name for login).</li>
        </ul>
        <p>Each processor receives only the minimum data needed for its function. We do not share browsing behavior, messages, or financial history with any third party.</p>
      </LegalSection>

      <LegalSection
        id="security"
        title="Security Measures"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
      >
        <ul>
          <li>Passwords are hashed with <strong>bcrypt</strong> (cost factor 12).</li>
          <li>Escrow credentials are encrypted with <strong>AES-256-GCM</strong> at rest.</li>
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
        <ul>
          <li>Financial records are retained as required by law for accounting and fraud prevention (minimum 5 years).</li>
          <li>You may request full account deletion at any time.</li>
          <li>Upon deletion, non-financial personal data is removed or anonymized within 30 days.</li>
          <li>Messages in completed disputes may be retained for legal compliance.</li>
        </ul>
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
          <li><strong>Erasure</strong> — Request deletion of your account and associated data.</li>
          <li><strong>Portability</strong> — Receive your data in a machine-readable format.</li>
          <li><strong>Objection</strong> — Object to processing for specific purposes.</li>
        </ul>
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
