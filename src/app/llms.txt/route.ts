import { prisma } from "@/lib/db";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://accsmarkets.org";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

// /llms.txt — a concise, machine-friendly map of the site for AI assistants
// (ChatGPT, Gemini, Perplexity, Claude). Spec: https://llmstxt.org
export async function GET() {
  let posts: { slug: string; title: string; excerpt: string | null }[] = [];
  try {
    posts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 50,
      select: { slug: true, title: true, excerpt: true },
    });
  } catch {}

  const blogLines = posts
    .map((p) => `- [${p.title}](${BASE_URL}/blog/${p.slug})${p.excerpt ? `: ${p.excerpt.slice(0, 140)}` : ""}`)
    .join("\n");

  const body = `# AccsMarkets

> A secure peer-to-peer marketplace for buying and selling social media accounts (Instagram, YouTube, TikTok, X, Facebook, Telegram), protected by built-in escrow and KYC seller verification.

AccsMarkets lets creators and businesses safely buy and sell established social media accounts. Every deal is held in escrow until the account transfer is verified, reducing fraud for both buyers and sellers.

## Key pages
- [Marketplace listings](${BASE_URL}/listings): browse verified social media accounts for sale.
- [How it works / escrow guide](${BASE_URL}/escrow-guide): how escrow-protected account transfers work.
- [Pricing](${BASE_URL}/pricing): fees and subscription plans.
- [Trust & safety](${BASE_URL}/trust): buyer/seller protection and verification.
- [Blog](${BASE_URL}/blog): guides on buying and selling social media accounts safely.

## Blog articles
${blogLines || "- (no articles published yet)"}

## Sitemap
- [XML sitemap](${BASE_URL}/sitemap.xml)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
