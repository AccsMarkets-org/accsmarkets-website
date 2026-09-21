import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PLATFORM_SEO } from "@/lib/seo-platforms";
import { getRoutes, RESOURCES_BASE } from "@/lib/opinly";

const BASE_URL = "https://accsmarkets.org";

// Without this a GET handler with no dynamic APIs is rendered once at build
// time and frozen until the next deploy — new listings/posts never appeared.
export const revalidate = 3600;

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: string }[] = [
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
  { path: "/kyc-policy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/refunds", priority: 0.3, changeFrequency: "yearly" },
  { path: "/aml", priority: 0.2, changeFrequency: "yearly" },
  { path: "/cookies", priority: 0.2, changeFrequency: "yearly" },
];

const MAX_LISTINGS = 1000;
const MAX_BLOG_POSTS = 500;
const MAX_SELLERS = 500;
const MAX_RESOURCE_ROUTES = 1000;

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function urlEntry(url: string, lastmod: Date, changefreq: string, priority: number): string {
  return `  <url>\n    <loc>${escapeXml(url)}</loc>\n    <lastmod>${lastmod.toISOString().split("T")[0]}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority.toFixed(1)}</priority>\n  </url>`;
}

export async function GET() {
  const now = new Date();

  const [listings, blogPosts, sellers, resourceRoutes] = await Promise.all([
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
    // /resources content is remote (Opinly). One cached call lists every
    // route; if the API is down the rest of the sitemap still renders.
    getRoutes().catch(() => []),
  ]);

  const RESOURCE_PATH: Record<string, string> = {
    post: RESOURCES_BASE,
    category: `${RESOURCES_BASE}/category`,
    author: `${RESOURCES_BASE}/author`,
  };
  const resourceEntries = resourceRoutes
    .filter((r) => r.slug && RESOURCE_PATH[r.type])
    .slice(0, MAX_RESOURCE_ROUTES)
    .map((r) => {
      const modified = new Date(r.lastModified);
      return urlEntry(
        `${BASE_URL}${RESOURCE_PATH[r.type]}/${encodeURIComponent(r.slug)}`,
        isNaN(modified.getTime()) ? now : modified,
        r.type === "post" ? "monthly" : "weekly",
        r.type === "post" ? 0.5 : 0.3,
      );
    });

  const entries: string[] = [
    ...STATIC_ROUTES.map((r) => urlEntry(`${BASE_URL}${r.path}`, now, r.changeFrequency, r.priority)),
    ...PLATFORM_SEO.map((p) => urlEntry(`${BASE_URL}/buy/${p.slug}`, now, "daily", 0.6)),
    ...listings.map((l) => urlEntry(`${BASE_URL}/listings/${l.id}`, l.updatedAt, "daily", 0.5)),
    ...blogPosts.map((b) => urlEntry(`${BASE_URL}/blog/${b.slug}`, b.updatedAt, "monthly", 0.5)),
    ...sellers.filter((s) => s.username).map((s) => urlEntry(`${BASE_URL}/seller/${s.username}`, s.updatedAt, "weekly", 0.4)),
    ...resourceEntries,
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
