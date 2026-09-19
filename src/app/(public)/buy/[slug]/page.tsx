import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ListingCard } from "@/components/listings/ListingCard";
import { PLATFORM_SEO, getPlatformSeoBySlug } from "@/lib/seo-platforms";
import { PLATFORM_COLOR } from "@/lib/constants";

const BASE_URL = "https://accsmarkets.org";

export const revalidate = 300;

export function generateStaticParams() {
  return PLATFORM_SEO.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const seo = getPlatformSeoBySlug(params.slug);
  if (!seo) return {};
  const url = `${BASE_URL}/buy/${seo.slug}`;
  return {
    title: { absolute: seo.title },
    description: seo.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: seo.title,
      description: seo.metaDescription,
      url,
      type: "website",
      siteName: "AccsMarkets",
      images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" as const, title: seo.title, description: seo.metaDescription },
  };
}

export default async function BuyPlatformPage({ params }: { params: { slug: string } }) {
  const seo = getPlatformSeoBySlug(params.slug);
  if (!seo) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let listings: any[] = [];
  let total = 0;
  try {
    [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where: { status: "ACTIVE", platform: seo.platform, isPrivate: false },
        orderBy: [{ featuredUntil: "desc" }, { createdAt: "desc" }],
        take: 12,
        include: { seller: { select: { username: true, name: true, verifiedBadge: true, trustScore: true, countryCode: true } } },
      }),
      prisma.listing.count({ where: { status: "ACTIVE", platform: seo.platform, isPrivate: false } }),
    ]);
  } catch {}

  const pageUrl = `${BASE_URL}/buy/${seo.slug}`;
  const color = PLATFORM_COLOR[seo.platform] ?? "#f97316";

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: seo.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Browse Listings", item: `${BASE_URL}/listings` },
      { "@type": "ListItem", position: 3, name: seo.h1, item: pageUrl },
    ],
  };

  const itemListJsonLd = listings.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: listings.map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${BASE_URL}/listings/${l.id}`,
      name: l.title,
    })),
  } : null;

  const otherPlatforms = PLATFORM_SEO.filter((p) => p.slug !== seo.slug);

  // Avoids "Website website" when the platform name already IS the unit word.
  const nameRedundant = seo.name.toLowerCase() === seo.unit.toLowerCase();
  const unitLabel = nameRedundant ? seo.unit : `${seo.name} ${seo.unit}`;
  const unitPluralLabel = nameRedundant ? seo.unitPlural : `${seo.name} ${seo.unitPlural}`;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }} />
      {itemListJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, "\\u003c") }} />
      )}

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-foreground">Home</Link></li>
          <li aria-hidden>›</li>
          <li><Link href="/listings" className="hover:text-foreground">Browse</Link></li>
          <li aria-hidden>›</li>
          <li className="font-medium text-foreground">{seo.h1}</li>
        </ol>
      </nav>

      {/* Hero */}
      <div className="mb-10 max-w-3xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: color }}>
          {seo.name}
        </div>
        <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">{seo.h1}</h1>
        <p className="mt-3 text-sm text-muted">
          {total > 0
            ? `${total.toLocaleString()} verified ${total === 1 ? unitLabel : unitPluralLabel} for sale · escrow-protected`
            : `Verified ${unitPluralLabel} for sale · escrow-protected`}
        </p>
        <div className="mt-5 flex flex-col gap-4 text-[15px] leading-relaxed text-foreground/85">
          {seo.intro.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>

      {/* Live listings */}
      <section className="mb-14">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-foreground">
            {unitPluralLabel.charAt(0).toUpperCase() + unitPluralLabel.slice(1)} for Sale
          </h2>
          <Link
            href={`/listings?platform=${seo.platform}`}
            className="shrink-0 rounded-xl border border-surface-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand-300"
          >
            View all {total > 12 ? `(${total.toLocaleString()})` : ""}
          </Link>
        </div>
        {listings.length === 0 ? (
          <div className="rounded-2xl border border-surface-border bg-surface px-6 py-16 text-center">
            <p className="text-lg font-bold text-foreground">No active {seo.name} listings right now</p>
            <p className="mt-1 text-sm text-muted">New {unitPluralLabel} are listed daily — check back soon or post a wanted request.</p>
            <div className="mt-5 flex justify-center gap-3">
              <Link href="/listings" className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600">Browse all listings</Link>
              <Link href="/listings?tab=wanted" className="rounded-xl border border-surface-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-brand-300">Post a wanted request</Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={{ ...listing, price: listing.price.toString() }} />
            ))}
          </div>
        )}
      </section>

      {/* Why buy */}
      <section className="mb-14">
        <h2 className="mb-5 text-2xl font-bold text-foreground">Why Buy a {unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1)}?</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seo.whyBuy.map((item) => (
            <div key={item.title} className="rounded-2xl border border-surface-border bg-background p-5">
              <p className="font-semibold text-foreground">{item.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How escrow protects you */}
      <section className="mb-14 rounded-2xl border border-surface-border bg-surface p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-foreground">Every Purchase Protected by Escrow</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          {[
            { step: "1", title: "Pay into escrow", text: "Your payment is held securely by AccsMarkets — the seller can't touch it yet." },
            { step: "2", title: "Receive the " + seo.unit, text: `The seller transfers the ${seo.unit} to you: credentials, linked email, and recovery details.` },
            { step: "3", title: "Confirm & release", text: "Verify everything matches the listing, then release payment. Problems? Open a dispute for a refund." },
          ].map((s) => (
            <div key={s.step} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">{s.step}</span>
              <div>
                <p className="font-semibold text-foreground">{s.title}</p>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/escrow-guide" className="mt-6 inline-block text-sm font-semibold text-brand-500 hover:text-brand-600">
          Read the full escrow guide →
        </Link>
      </section>

      {/* FAQs */}
      <section className="mb-14 max-w-3xl">
        <h2 className="mb-5 text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
        <div className="flex flex-col gap-3">
          {seo.faqs.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-surface-border bg-background p-5">
              <summary className="cursor-pointer list-none font-semibold text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
                {f.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Sell CTA */}
      <section className="mb-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-6 text-white sm:p-8">
        <h2 className="text-2xl font-bold">Selling a {unitLabel}?</h2>
        <p className="mt-2 max-w-xl text-sm text-white/85">
          List your {unitLabel} on AccsMarkets and reach thousands of buyers. Free to list — you only pay a fee when it sells, and escrow protects you from chargebacks.
        </p>
        <Link href="/dashboard/listings/new" className="mt-5 inline-block rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-brand-600 transition hover:bg-white/90">
          Sell your {seo.unit}
        </Link>
      </section>

      {/* Other platforms */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-foreground">Browse Other Platforms</h2>
        <div className="flex flex-wrap gap-2">
          {otherPlatforms.map((p) => (
            <Link
              key={p.slug}
              href={`/buy/${p.slug}`}
              className="rounded-full border border-surface-border px-4 py-1.5 text-sm font-medium text-muted transition hover:border-brand-300 hover:text-foreground"
            >
              {p.h1}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
