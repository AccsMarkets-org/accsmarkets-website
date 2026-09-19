import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { BlogCard } from "@/components/blog/BlogCard";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://accsmarkets.org";

export const metadata = {
  // Bare title: the root layout's template ("%s — AccsMarkets") adds the
  // suffix once. This previously included "— AccsMarkets" itself too, which
  // the template then wrapped AGAIN, rendering as "Blog — AccsMarkets —
  // AccsMarkets" in the actual <title> tag.
  title: "Blog",
  description: "Tips, guides, and expert advice on buying and selling social media accounts safely. Escrow guides, platform reviews, and marketplace news.",
  openGraph: {
    title: "Blog — AccsMarkets",
    description: "Expert tips and guides on buying and selling social media accounts safely.",
    url: "https://accsmarkets.org/blog",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const, title: "Blog — AccsMarkets" },
  alternates: { canonical: "https://accsmarkets.org/blog" },
};

export default async function BlogIndexPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let posts: any[] = [];
  try {
    posts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      // 36 published today; 100 gives headroom for months of regular
      // posting without orphaning older articles from this page's links
      // (Google was only finding them via the sitemap, not real internal
      // links, once the post count passed the old cap of 20). Revisit with
      // real pagination if the count grows well past this.
      take: 100,
      select: { id: true, slug: true, title: true, excerpt: true, coverImage: true, tags: true, publishedAt: true, viewCount: true },
    });
  } catch {
    // DB unavailable
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${BASE_URL}/blog#collection`,
        name: "AccsMarkets Blog",
        description: "Tips, guides, and expert advice on buying and selling social media accounts safely.",
        url: `${BASE_URL}/blog`,
        isPartOf: { "@type": "WebSite", name: "AccsMarkets", url: BASE_URL },
      },
      {
        "@type": "ItemList",
        itemListElement: posts.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${BASE_URL}/blog/${p.slug}`,
          name: p.title,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted">
        <ol className="flex items-center gap-1.5">
          <li><Link href="/" className="hover:text-brand-600">Home</Link></li>
          <li aria-hidden className="text-muted/50">/</li>
          <li className="text-foreground/80">Blog</li>
        </ol>
      </nav>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Blog</h1>
        <p className="mt-2 text-muted">Tips, guides and news for social media account buyers and sellers.</p>
      </div>

      {posts.length === 0 ? (
        <p className="text-muted">No posts yet — check back soon.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
