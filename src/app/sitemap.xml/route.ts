import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { getRoutes, RESOURCES_BASE } from "@/lib/opinly";
import { PLATFORM_SEO } from "@/lib/seo-platforms";

// Same source-of-truth pattern used everywhere else in the app (blog pages,
// robots.ts, email templates) — was hardcoded as a literal here, which would
// silently drift from the rest of the site if the domain/env ever changed.
const BASE_URL = process.env.NEXTAUTH_URL ?? "https://accsmarkets.org";

function url(
  loc: string,
  lastmod: Date | string | null | undefined,
  changefreq: string,
  priority: number
): string {
  // lastmod is spec-optional — omit it rather than fabricate "now" for pages
  // with no real tracked modification date (static marketing pages below).
  // Google explicitly discounts a lastmod that never varies, and re-stamping
  // every page "now" on every crawl is exactly the fake-freshness signal
  // that practice produces.
  if (!lastmod) {
    return `<url><loc>${loc}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
  }
  const mod = typeof lastmod === "string" ? lastmod : lastmod.toISOString();
  return `<url><loc>${loc}</loc><lastmod>${mod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

const getDynamicSitemapUrls = unstable_cache(
  async () => {
    const dynamicUrls: string[] = [];

    try {
      const listings = await prisma.listing.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5000,
      });
      for (const l of listings) {
        dynamicUrls.push(url(`${BASE_URL}/listings/${l.id}`, l.updatedAt, "weekly", 0.8));
      }
    } catch {}

    try {
      const sellers = await prisma.user.findMany({
        where: { username: { not: null } },
        select: { username: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5000,
      });
      for (const s of sellers) {
        if (s.username) {
          dynamicUrls.push(url(`${BASE_URL}/seller/${s.username}`, s.updatedAt, "weekly", 0.6));
        }
      }
    } catch {}

    try {
      const posts = await prisma.blogPost.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 2000,
      });
      for (const p of posts) {
        dynamicUrls.push(url(`${BASE_URL}/blog/${p.slug}`, p.updatedAt, "monthly", 0.55));
      }
    } catch {}

    try {
      const wanted = await prisma.wantedListing.findMany({
        where: { status: "OPEN" },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 2000,
      });
      for (const w of wanted) {
        dynamicUrls.push(url(`${BASE_URL}/wanted/${w.id}`, w.updatedAt, "weekly", 0.5));
      }
    } catch {}

    return dynamicUrls;
  },
  ["sitemap-dynamic-urls"],
  { revalidate: 1800, tags: ["sitemap"] }
);

export const dynamic = "force-dynamic";

export async function GET() {
  // No real per-page modification tracking exists for these static routes
  // (no CMS/DB field) — lastmod is omitted for them rather than stamped with
  // the current request time (see the `url()` helper above).
  const staticUrls = [
    url(BASE_URL,                       null, "daily",   1.0),
    url(`${BASE_URL}/listings`,         null, "hourly",  0.95),
    ...PLATFORM_SEO.map((p) => url(`${BASE_URL}/buy/${p.slug}`, null, "daily", 0.9)),
    url(`${BASE_URL}/sellers`,          null, "daily",   0.7),
    url(`${BASE_URL}/help`,             null, "weekly",  0.6),
    url(`${BASE_URL}/docs`,             null, "monthly", 0.5),
    url(`${BASE_URL}/status`,           null, "daily",   0.3),
    url(`${BASE_URL}/sitemap`,          null, "monthly", 0.2),
    url(`${BASE_URL}/blog`,             null, "daily",   0.85),
    url(`${BASE_URL}/pricing`,          null, "weekly",  0.8),
    url(`${BASE_URL}/escrow-guide`,      null, "monthly", 0.75),
    url(`${BASE_URL}/about`,            null, "monthly", 0.6),
    url(`${BASE_URL}/faq`,              null, "weekly",  0.65),
    url(`${BASE_URL}/contact`,          null, "monthly", 0.5),
    url(`${BASE_URL}/fees`,             null, "monthly", 0.5),
    url(`${BASE_URL}/trust`,            null, "monthly", 0.5),
    url(`${BASE_URL}/terms`,            null, "monthly", 0.25),
    url(`${BASE_URL}/privacy`,          null, "monthly", 0.25),
    url(`${BASE_URL}/aml`,              null, "monthly", 0.2),
    url(`${BASE_URL}/cookies`,          null, "monthly", 0.2),
    url(`${BASE_URL}${RESOURCES_BASE}`, null, "daily",   0.85),
  ];

  const dynamicUrls = await getDynamicSitemapUrls();

  // Opinly content routes (/resources/*) — merged in; failure never breaks the
  // rest of the sitemap (listings/sellers/blog/wanted stay indexed).
  const opinlyUrls: string[] = [];
  try {
    const routes = await getRoutes();
    for (const r of routes) {
      // Real per-article date from Opinly's own CMS when it has one; omitted
      // (not faked) otherwise, same rule as the static pages above.
      const lm = r.lastModified || null;
      if (r.type === "home") continue; // already added as the /resources static URL
      if (r.type === "post") opinlyUrls.push(url(`${BASE_URL}${RESOURCES_BASE}/${r.slug}`, lm, "weekly", 0.7));
      else if (r.type === "category") opinlyUrls.push(url(`${BASE_URL}${RESOURCES_BASE}/category/${r.slug}`, lm, "weekly", 0.5));
      else if (r.type === "author") opinlyUrls.push(url(`${BASE_URL}${RESOURCES_BASE}/author/${r.slug}`, lm, "monthly", 0.4));
    }
  } catch {}

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticUrls, ...dynamicUrls, ...opinlyUrls].join("\n")}\n</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
