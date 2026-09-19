import Link from "next/link";
import { PLATFORM_SEO } from "@/lib/seo-platforms";

const BASE_URL = "https://accsmarkets.org";

export const metadata = {
  title: "Sitemap — AccsMarkets",
  description: "Browse all sections of AccsMarkets — listings, platforms, trust & safety, company and legal pages.",
  alternates: { canonical: `${BASE_URL}/sitemap` },
};

const SECTIONS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Marketplace",
    links: [
      { label: "Browse listings", href: "/listings" },
      { label: "Sellers", href: "/sellers" },
      { label: "Blog", href: "/blog" },
      { label: "Pricing", href: "/pricing" },
      { label: "Fees", href: "/fees" },
      { label: "Start selling", href: "/register" },
    ],
  },
  {
    title: "Buy by Platform",
    links: PLATFORM_SEO.map((p) => ({ label: p.h1, href: `/buy/${p.slug}` })),
  },
  {
    title: "Trust & Safety",
    links: [
      { label: "How escrow works", href: "/escrow-guide" },
      { label: "Trust & safety overview", href: "/trust" },
      { label: "Security", href: "/security" },
      { label: "Refund policy", href: "/refunds" },
      { label: "FAQ", href: "/faq" },
      { label: "Help Center", href: "/help" },
      { label: "System status", href: "/status" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/career" },
      { label: "Contact", href: "/contact" },
      { label: "API Documentation", href: "/docs" },
      { label: "Developer Portal", href: "/dashboard/developer" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "AML Policy", href: "/aml" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/register" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
];

export default function SitemapPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-black tracking-tight text-foreground">Sitemap</h1>
      <p className="mt-1.5 text-sm text-muted">Every section of AccsMarkets, in one place.</p>

      <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{section.title}</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-foreground/85 transition hover:text-brand-500">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-14 text-xs text-muted">
        Looking for the machine-readable version? See{" "}
        <a href="/sitemap.xml" className="text-brand-500 hover:underline">sitemap.xml</a>.
      </p>
    </main>
  );
}
