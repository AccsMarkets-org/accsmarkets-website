import { prisma } from "@/lib/db";
import { LandingHero } from "@/components/landing/LandingHero";
import { PlatformMarquee } from "@/components/landing/PlatformMarquee";
import {
  StatsBand,
  HowItWorks,
  SecuritySection,
  FaqSection,
  FinalCta,
} from "@/components/landing/LandingSections";
import { FeaturedListings } from "@/components/landing/FeaturedListings";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { LatestBlogPosts } from "@/components/landing/LatestBlogPosts";

export const revalidate = 120;

const WEBSITE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "AccsMarkets",
  url: "https://accsmarkets.org",
  description: "A secure peer-to-peer marketplace for buying and selling social media accounts, protected by escrow.",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: "https://accsmarkets.org/listings?q={search_term_string}" },
    "query-input": "required name=search_term_string",
  },
};

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AccsMarkets",
  url: "https://accsmarkets.org",
  logo: "https://accsmarkets.org/icons/icon-512.png",
  telephone: "+17737156402",
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    telephone: "+17737156402",
    url: "https://accsmarkets.org/contact",
  },
};

export default async function HomePage() {
  const [listings, listingCount, completedEscrows, sellerCount, testimonialReviews] = await Promise.all([
    prisma.listing
      .findMany({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { seller: { select: { username: true, name: true, verifiedBadge: true } } },
      })
      .catch(() => []),
    prisma.listing.count({ where: { status: { in: ["ACTIVE", "SOLD"] } } }).catch(() => 0),
    prisma.escrow.count({ where: { status: "COMPLETED" } }).catch(() => 0),
    prisma.listing
      .groupBy({ by: ["sellerId"], where: { status: { in: ["ACTIVE", "SOLD"] } } })
      .then((rows) => rows.length)
      .catch(() => 0),
    prisma.review
      .findMany({
        where: { rating: { gte: 4 }, comment: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          reviewer: { select: { username: true, name: true, image: true } },
          reviewee: { select: { username: true, name: true } },
        },
      })
      .catch(() => []),
  ]);

  const testimonials = testimonialReviews
    .filter((r) => r.comment && r.comment.trim().length >= 15)
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment as string,
      createdAt: r.createdAt.toISOString(),
      reviewer: r.reviewer,
      reviewee: r.reviewee,
    }));

  const cardListings = listings.map((l) => ({
    id: l.id,
    title: l.title,
    platform: l.platform,
    price: l.price.toString(),
    followers: l.followers,
    monetized: l.monetized,
    screenshots: l.screenshots,
    accountLogo: l.accountLogo,
    seller: l.seller,
  }));

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSONLD).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD).replace(/</g, "\\u003c") }}
      />
      <LandingHero />
      <PlatformMarquee />
      <StatsBand listings={listingCount} completedEscrows={completedEscrows} sellers={sellerCount} />
      <HowItWorks />
      <FeaturedListings listings={cardListings} />
      <TestimonialsSection testimonials={testimonials} />
      <SecuritySection />
      <FaqSection />
      <LatestBlogPosts />
      <FinalCta />
    </main>
  );
}
