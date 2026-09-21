import { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/ui/LegalPageLayout";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "KYC Policy — AccsMarkets",
  description: "AccsMarkets identity verification (KYC) policy — what we collect, how we store it, and your rights.",
};

const SECTIONS = [
  { id: "overview", title: "Overview" },
  { id: "who", title: "Who Must Verify" },
  { id: "what", title: "What We Collect" },
  { id: "how", title: "How We Use It" },
  { id: "security", title: "Security & Encryption" },
  { id: "retention", title: "Retention" },
  { id: "rights", title: "Your Rights" },
  { id: "contact", title: "Contact" },
];

export default function KycPolicyPage() {
  return (
    <LegalPageLayout
      title="KYC Policy"
      subtitle="How AccsMarkets collects, protects, and uses your identity information."
      updatedAt="September 2026"
      sections={SECTIONS}
    >
      <LegalSection
        id="overview"
        title="Overview"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
      >
        <p>
          AccsMarkets operates an escrow-protected marketplace for buying and selling social media accounts.
          To comply with our Anti-Money Laundering (AML) obligations and to protect both buyers and sellers
          from fraud, we require users to complete a Know Your Customer (KYC) identity verification process
          before accessing certain features of the platform.
        </p>
        <p>
          This policy explains what identity data we collect, how it is stored and protected, why we need
          it, and the rights you have over that data.
        </p>
      </LegalSection>

      <LegalSection
        id="who"
        title="Who Must Verify"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
      >
        <p>KYC verification is required for users who wish to:</p>
        <ul>
          <li>List accounts for sale on the marketplace</li>
          <li>Initiate or participate in escrow transactions above certain thresholds</li>
          <li>Withdraw funds from their AccsMarkets wallet</li>
          <li>Access higher trust tiers and verified seller badges</li>
        </ul>
        <p>
          Basic browsing and purchasing of low-value listings may be available with email verification only.
          Full identity verification unlocks the complete platform.
        </p>
      </LegalSection>

      <LegalSection
        id="what"
        title="What We Collect"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
      >
        <p>During the KYC process we collect the following documents and information:</p>
        <ul>
          <li>
            <strong>Government-issued photo ID (front)</strong> — passport, national identity card, or
            driver&apos;s licence issued by your country of residence.
          </li>
          <li>
            <strong>Government-issued photo ID (back)</strong> — the reverse side of your ID card (where
            applicable; passports require only the photo page).
          </li>
          <li>
            <strong>Selfie with ID</strong> — a photo of you holding your ID document next to your face so
            we can confirm you are the person named in the document.
          </li>
          <li>
            <strong>Email address</strong> — verified by a one-time code sent to your registered email.
          </li>
        </ul>
        <p>
          We do not collect biometric data beyond what is visible in the photos you submit. We do not
          perform automated facial recognition. All review is carried out by human compliance staff.
        </p>
      </LegalSection>

      <LegalSection
        id="how"
        title="How We Use It"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      >
        <p>Your identity documents are used solely for the following purposes:</p>
        <ul>
          <li>Confirming that you are a real person and the owner of the account being registered</li>
          <li>Complying with our AML/CFT obligations under applicable law</li>
          <li>Investigating disputes or fraud reports where identity is relevant</li>
          <li>Responding to lawful requests from law enforcement or regulatory bodies</li>
        </ul>
        <p>
          We <strong>do not</strong> sell, rent, or share your identity documents with third parties for
          marketing or commercial purposes. We do not use your KYC data to train machine learning models.
        </p>
      </LegalSection>

      <LegalSection
        id="security"
        title="Security & Encryption"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
      >
        <p>
          We take the security of your identity documents seriously. Every document URL and sensitive field
          is encrypted at rest using <strong>AES-256-GCM</strong> (256-bit key, authenticated encryption
          with a unique IV per record) before it is written to our database. This means:
        </p>
        <ul>
          <li>Raw document storage URLs are never stored in plaintext in the database</li>
          <li>Even in the event of a database breach, document URLs cannot be read without the encryption key</li>
          <li>Encryption keys are stored separately from the data they protect and are rotated periodically</li>
          <li>All data in transit is protected by TLS 1.3</li>
        </ul>
        <p>
          Access to decrypted KYC data is restricted to a small number of authorised compliance staff and
          is logged for audit purposes. Staff access is reviewed quarterly.
        </p>
      </LegalSection>

      <LegalSection
        id="retention"
        title="Retention"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
      >
        <p>
          We retain identity verification records for a minimum of <strong>5 years</strong> from the date
          of submission, or 5 years after the closure of your account, whichever is later. This retention
          period is required by applicable AML legislation.
        </p>
        <p>
          After the mandatory retention period has expired, documents are securely deleted from our systems.
          You may request early deletion; however, if your account remains active or is subject to an
          ongoing dispute or legal hold, deletion will be deferred until those circumstances are resolved.
        </p>
      </LegalSection>

      <LegalSection
        id="rights"
        title="Your Rights"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>}
      >
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <ul>
          <li><strong>Access</strong> — request a copy of the identity data we hold about you</li>
          <li><strong>Rectification</strong> — ask us to correct inaccurate data</li>
          <li><strong>Erasure</strong> — request deletion of your data (subject to legal retention obligations)</li>
          <li><strong>Restriction</strong> — ask us to limit how we use your data while a dispute is resolved</li>
          <li><strong>Portability</strong> — receive your data in a structured, machine-readable format</li>
          <li><strong>Objection</strong> — object to processing based on our legitimate interests</li>
        </ul>
        <p>
          To exercise any of these rights, submit a request via the{" "}
          <a href="/dashboard/settings" className="text-brand-500 underline hover:text-brand-400">
            Settings → Privacy
          </a>{" "}
          section of your account or contact us at the address below.
        </p>
      </LegalSection>

      <LegalSection
        id="contact"
        title="Contact"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
      >
        <p>
          For questions about this KYC Policy or to exercise your data rights, please contact our compliance
          team:
        </p>
        <ul>
          <li><strong>Email:</strong> compliance@accsmarkets.org</li>
          <li><strong>Response time:</strong> We aim to respond to all data rights requests within 30 days</li>
        </ul>
        <p>
          This policy is reviewed annually and updated whenever our practices change. The current version
          was last updated in <strong>September 2026</strong>.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
