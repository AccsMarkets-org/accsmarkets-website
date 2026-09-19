import { getRss, RESOURCES_BASE } from "@/lib/opinly";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://accsmarkets.org";

export const dynamic = "force-dynamic";
export const revalidate = 900;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  let items: Awaited<ReturnType<typeof getRss>> = [];
  try {
    items = await getRss(20);
  } catch {
    items = [];
  }

  const entries = items
    .map((it) => {
      const link = `${BASE_URL}${RESOURCES_BASE}/${it.slug}`;
      const date = it.date ? new Date(it.date) : null;
      const pubDate = date && !isNaN(date.getTime()) ? date.toUTCString() : new Date().toUTCString();
      const cats = (it.categories ?? []).map((c) => `<category>${esc(c)}</category>`).join("");
      return `<item><title>${esc(it.title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><description>${esc(it.description ?? "")}</description><pubDate>${pubDate}</pubDate>${cats}</item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>AccsMarkets Resources</title>
<link>${BASE_URL}${RESOURCES_BASE}</link>
<description>Guides and insights on buying and selling social media accounts safely.</description>
<language>en</language>
<atom:link href="${BASE_URL}${RESOURCES_BASE}/rss.xml" rel="self" type="application/rss+xml"/>
${entries}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
}
