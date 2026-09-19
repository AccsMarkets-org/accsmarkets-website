import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { PLATFORM_SEO } from "@/lib/seo-platforms";

// Next.js serves this at /sitemap.xml automatically. Only real, public,
// indexable routes belong here — no admin, dashboard, auth-only, or
// noindex pages. Fixes the public sitemap page's previously-broken link to
// a /sitemap.xml that didn't exist anywhere in the project.

const BASE_URL = "https://accsmarkets.org";

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1.0, changeFrequency: "daily" },
  { path: "/listings", priority: 0.9, changeFrequency: "hourly" },
  { path: "/sellers", priority: 0.7, changeFrequency: "daily" },
  { path: "/pricing", priority: 0.7, changeFrequency: "weekly" },
  { path: "/blog", priority: 0.7, changeFrequency: "daily" },
  { path: "/resources", priority: 0.6, changeFrequency: "daily" },
  { path: "/escrow-guide", priority: 0.6, changeFrequency: "monthly" },
  { path: "/trust", priority: 0.6, changeFrequency: "monthly" },
  { path: "/security", priority: 0.5, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.5, changeFrequency: "monthly" },
  { path: "/help", priority: 0.5, changeFrequency: "monthly" },
  { path: "/fees", priority: 0.5, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.4, changeFrequency: "yearly" },
  { path: "/apps", priority: 0.4, changeFrequency: "weekly" },
  { path: "/docs", priority: 0.4, changeFrequency: "monthly" },
  { path: "/career", priority: 0.3, changeFrequency: "monthly" },
  { path: "/sitemap", priority: 0.3, changeFrequency: "monthly" },
  { path: "/status", priority: 0.3, changeFrequency: "daily" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/refunds", priority: 0.3, changeFrequency: "yearly" },
  { path: "/aml", priority: 0.2, changeFrequency: "yearly" },
  { path: "/cookies", priority: 0.2, changeFrequency: "yearly" },
];

// Cap high-cardinality dynamic sections so this stays a reasonably-sized,
// fast-to-generate sitemap rather than dumping the entire database.
const MAX_LISTINGS = 1000;
const MAX_BLOG_POSTS = 500;
const MAX_SELLERS = 500;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [listings, blogPosts, sellers] = await Promise.all([
    prisma.listing
      .findMany({
        where: { status: "ACTIVE", isPrivate: false },
        orderBy: { updatedAt: "desc" },
        take: MAX_LISTINGS,
        select: { id: true, updatedAt: true },
      })
      .catch(() => []),
    prisma.blogPost
      .findMany({
        where: { status: "PUBLISHED" },
        orderBy: { updatedAt: "desc" },
        take: MAX_BLOG_POSTS,
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
    prisma.user
      .findMany({
        where: { isBanned: false, listings: { some: { status: "ACTIVE" } } },
        orderBy: { trustScore: "desc" },
        take: MAX_SELLERS,
        select: { username: true, updatedAt: true },
      })
      .catch(() => []),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const platformEntries: MetadataRoute.Sitemap = PLATFORM_SEO.map((p) => ({
    url: `${BASE_URL}/buy/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const listingEntries: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${BASE_URL}/listings/${l.id}`,
    lastModified: l.updatedAt,
    changeFrequency: "daily",
    priority: 0.5,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((b) => ({
    url: `${BASE_URL}/blog/${b.slug}`,
    lastModified: b.updatedAt,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const sellerEntries: MetadataRoute.Sitemap = sellers
    .filter((s) => s.username)
    .map((s) => ({
      url: `${BASE_URL}/seller/${s.username}`,
      lastModified: s.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    }));

  return [...staticEntries, ...platformEntries, ...listingEntries, ...blogEntries, ...sellerEntries];
}
