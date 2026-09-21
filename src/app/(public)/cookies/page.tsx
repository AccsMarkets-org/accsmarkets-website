import { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/ui/LegalPageLayout";

export const revalidate = 86400;

export const metadata: Metadata = { title: "Cookie Policy — AccsMarkets", description: "How we use cookies and similar technologies." };

const SECTIONS = [
  { id: "what", title: "What Are Cookies" },
  { id: "types", title: "Types We Use" },
  { id: "essential", title: "Essential Cookies" },
  { id: "analytics", title: "Analytics Cookies" },
  { id: "preferences", title: "Preference Cookies" },
  { id: "manage", title: "Managing Cookies" },
];

export default function CookiePolicyPage() {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      subtitle="How AccsMarkets uses cookies and similar technologies."
      updatedAt="July 2026"
      sections={SECTIONS}
    >
      <LegalSection
        id="what"
        title="What Are Cookies"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      >
        <p>
          Cookies are small text files stored on your device when you visit a website. They help
          the site remember your preferences, keep you logged in, and understand how you use the platform.
        </p>
        <p>
          We also use similar technologies like local storage and session storage where appropriate.
        </p>
      </LegalSection>

      <LegalSection
        id="types"
        title="Types of Cookies We Use"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 6h16M4 12h16M4 18h7" /></svg>}
      >
        <p>We categorize our cookies into four types:</p>
        <ul>
          <li><strong>Essential</strong> — Required for the platform to function. Cannot be disabled.</li>
          <li><strong>Analytics</strong> — Google Analytics helps us understand usage patterns and improve the platform.</li>
          <li><strong>Advertising</strong> — Google AdSense and the Meta Pixel may set cookies on public pages to measure and serve ads.</li>
          <li><strong>Preferences</strong> — Remember your settings like theme and currency.</li>
        </ul>
        <p>You can opt out of analytics and advertising cookies through your browser settings, Google&apos;s Ads Settings, or Meta&apos;s ad preferences. Essential cookies are always set.</p>
      </LegalSection>

      <LegalSection
        id="essential"
        title="Essential Cookies"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
      >
        <p>These cookies are strictly necessary for the site to work:</p>
        <ul>
          <li><strong>next-auth.session-token</strong> — Maintains your login session securely.</li>
          <li><strong>next-auth.csrf-token</strong> — Protects against cross-site request forgery attacks.</li>
          <li><strong>cookie-consent</strong> — Records your cookie preferences.</li>
        </ul>
      </LegalSection>

      <LegalSection
        id="analytics"
        title="Analytics Cookies"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
      >
        <p>
          When you consent, we may use analytics tools to understand platform usage.
          This data is aggregated and anonymized — we never sell it to third parties.
        </p>
        <p>Analytics help us understand which features are most used and where users experience friction.</p>
      </LegalSection>

      <LegalSection
        id="preferences"
        title="Preference Cookies"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>}
      >
        <p>These remember your choices to provide a personalised experience:</p>
        <ul>
          <li><strong>Display currency</strong> — Your preferred currency for price display (e.g., USD, EUR).</li>
          <li><strong>Sound preferences</strong> — Whether notification sounds are muted.</li>
          <li><strong>Theme preference</strong> — Light or dark mode selection.</li>
        </ul>
      </LegalSection>

      <LegalSection
        id="manage"
        title="Managing Your Cookies"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>}
      >
        <p>You can control cookies in several ways:</p>
        <ul>
          <li><strong>Cookie banner</strong> — When you first visit, you can accept or decline non-essential cookies.</li>
          <li><strong>Browser settings</strong> — Most browsers let you block or delete cookies. Note that blocking essential cookies will prevent login.</li>
          <li><strong>Clear data</strong> — You can clear all stored data at any time in your browser settings.</li>
        </ul>
        <p>
          For questions about our cookie usage, contact us at <strong>privacy@accsmarkets.org</strong>.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
