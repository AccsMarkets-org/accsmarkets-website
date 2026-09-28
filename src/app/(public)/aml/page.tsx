import { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/ui/LegalPageLayout";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "AML Policy",
  description: "AccsMarkets' Anti-Money Laundering policy: KYC requirements, transaction monitoring, suspicious-activity reporting, record keeping and enforcement.",
  alternates: { canonical: "/aml" },
};

const SECTIONS = [
  { id: "purpose", title: "Purpose" },
  { id: "kyc", title: "KYC Requirements" },
  { id: "monitoring", title: "Transaction Monitoring" },
  { id: "source-of-funds", title: "Source of Funds" },
  { id: "suspicious", title: "Suspicious Activity" },
  { id: "records", title: "Record Keeping" },
  { id: "enforcement", title: "Enforcement" },
];

export default function AmlPage() {
  return (
    <LegalPageLayout
      title="Anti-Money Laundering Policy"
      subtitle="Our commitment to preventing financial crime on the AccsMarkets platform."
      updatedAt="September 2026"
      sections={SECTIONS}
    >
      <LegalSection
        id="purpose"
        title="Purpose"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
      >
        <p>
          AccsMarkets is committed to the highest standards of Anti-Money Laundering (AML) compliance.
          This policy establishes the framework we use to detect, prevent, and report money laundering,
          terrorist financing, and other financial crimes conducted through our platform.
        </p>
        <p>
          As a digital escrow platform facilitating cryptocurrency transactions, we recognize our obligation
          to maintain robust compliance controls proportionate to the risks we face.
        </p>
      </LegalSection>

      <LegalSection
        id="kyc"
        title="Know Your Customer (KYC)"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>}
      >
        <p>We implement tiered identity verification based on transaction volume:</p>
        <ul>
          <li><strong>Email verification</strong> — Required for all accounts. Allows browsing and limited activity.</li>
          <li><strong>Phone verification</strong> — Required before creating escrow transactions over $100.</li>
          <li><strong>ID verification</strong> — Required for cumulative transaction volume over $1,000. Government-issued photo ID and proof of address.</li>
        </ul>
        <p>
          We reserve the right to request additional documentation at any time if our risk assessment
          indicates elevated risk.
        </p>
      </LegalSection>

      <LegalSection
        id="monitoring"
        title="Transaction Monitoring"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
      >
        <p>Our automated monitoring systems flag transactions that exhibit suspicious patterns including:</p>
        <ul>
          <li>Unusually large transactions relative to account history</li>
          <li>Rapid successive transactions (structuring behavior)</li>
          <li>Transactions involving jurisdictions subject to sanctions</li>
          <li>Multiple accounts linked to the same identity</li>
          <li>Attempts to circumvent verification requirements</li>
        </ul>
        <p>
          All flagged transactions undergo manual review by our compliance team before processing.
        </p>
      </LegalSection>

      <LegalSection
        id="source-of-funds"
        title="Source of Funds for Large Transactions"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      >
        <p>
          Escrows at or above the platform&apos;s high-value threshold — currently <strong>$500</strong>, configurable
          by AccsMarkets and shown to admins in the platform settings — are automatically flagged as high-value
          transactions. A high-value escrow may require additional safeguards before funds are released, such as a
          transfer-manager handover step or video verification of the handover, depending on the listing&apos;s
          platform and our current risk assessment.
        </p>
        <p>
          For large or unusual transactions, we reserve the right to ask you to explain the source of the funds
          being deposited or withdrawn (for example, the origin of a large crypto deposit) before we process it.
          Failure to provide a satisfactory explanation may result in the transaction being held, declined, or
          reported as suspicious activity as described below.
        </p>
      </LegalSection>

      <LegalSection
        id="suspicious"
        title="Suspicious Activity Reporting"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
      >
        <p>
          When our monitoring identifies potentially suspicious activity, we take the following steps:
        </p>
        <ol>
          <li>Immediately suspend the affected transaction(s).</li>
          <li>Conduct enhanced due diligence on the involved parties.</li>
          <li>File a Suspicious Activity Report (SAR) with the relevant financial intelligence unit where required by law.</li>
          <li>Cooperate fully with law enforcement inquiries.</li>
        </ol>
        <p>
          Users may not be informed that a report has been filed, as &quot;tipping off&quot; is prohibited under most AML regulations.
        </p>
      </LegalSection>

      <LegalSection
        id="records"
        title="Record Keeping"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>}
      >
        <p>We maintain records of all transactions and identity verification documents for a minimum of 5 years, including:</p>
        <ul>
          <li>Transaction amounts, dates, and parties involved</li>
          <li>Cryptocurrency wallet addresses used</li>
          <li>Identity verification documents and results</li>
          <li>Communications related to flagged transactions</li>
          <li>Internal risk assessments and compliance decisions</li>
        </ul>
      </LegalSection>

      <LegalSection
        id="enforcement"
        title="Enforcement"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
      >
        <p>
          Violation of this policy or applicable AML laws may result in:
        </p>
        <ul>
          <li>Immediate account suspension or permanent ban</li>
          <li>Freezing of funds pending investigation</li>
          <li>Reporting to relevant law enforcement authorities</li>
          <li>Forfeiture of platform privileges</li>
        </ul>
        <p>
          For questions about our AML policy, contact our compliance team at{" "}
          <strong>compliance@accsmarkets.org</strong>.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
