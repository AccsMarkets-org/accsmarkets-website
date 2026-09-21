import Link from "next/link";
import type { Metadata } from "next";
import { getPosts, RESOURCES_BASE, type Post } from "@/lib/opinly";
import { PostCard } from "@/components/opinly/PostCard";
import { LoadMorePosts } from "@/components/opinly/LoadMorePosts";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://accsmarkets.org";
const TITLE = "Resources — AccsMarkets";
const DESCRIPTION = "Guides, insights, and news on buying and selling social media accounts safely.";

export const metadata: Metadata = {
  // Bare title — the root layout's "%s — AccsMarkets" template adds the brand.
  // TITLE (with brand) is still used for openGraph/twitter, which aren't templated.
  title: "Resources",
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}${RESOURCES_BASE}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}${RESOURCES_BASE}`,
    type: "website",
    siteName: "AccsMarkets",
    images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function ResourcesIndexPage({ searchParams }: { searchParams: { sort?: string } }) {
  const sort: "newest" | "oldest" = searchParams.sort === "oldest" ? "oldest" : "newest";

  let firstPage: { data: Post[]; has_more: boolean; next_cursor: string | null } | null = null;
  let failed = false;
  try {
    firstPage = await getPosts({ limit: 12, sort });
  } catch {
    failed = true;
  }

  const posts = firstPage?.data ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: TITLE,
        description: DESCRIPTION,
        url: `${BASE_URL}${RESOURCES_BASE}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Resources", item: `${BASE_URL}${RESOURCES_BASE}` },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted">
        <ol className="flex items-center gap-1.5">
          <li><Link href="/" className="hover:text-brand-600">Home</Link></li>
          <li aria-hidden className="text-muted/50">/</li>
          <li className="text-foreground/80">Resources</li>
        </ol>
      </nav>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
          <p className="mt-2 text-muted">{DESCRIPTION}</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-surface-border bg-surface p-1 text-xs font-medium">
          <Link
            href={`${RESOURCES_BASE}?sort=newest`}
            className={`rounded-lg px-3 py-1.5 transition ${sort === "newest" ? "bg-brand-500 text-white" : "text-muted hover:text-foreground"}`}
          >
            Newest
          </Link>
          <Link
            href={`${RESOURCES_BASE}?sort=oldest`}
            className={`rounded-lg px-3 py-1.5 transition ${sort === "oldest" ? "bg-brand-500 text-white" : "text-muted hover:text-foreground"}`}
          >
            Oldest
          </Link>
        </div>
      </div>

      {failed ? (
        <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 p-8 text-center">
          <p className="font-medium text-foreground">We couldn&apos;t load articles right now.</p>
          <p className="mt-1 text-sm text-muted">Please refresh the page or check back shortly.</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-surface-border bg-surface p-8 text-center">
          <p className="font-medium text-foreground">No articles yet.</p>
          <p className="mt-1 text-sm text-muted">Check back soon — new guides are on the way.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
          <LoadMorePosts
            initialCursor={firstPage?.next_cursor ?? null}
            initialHasMore={Boolean(firstPage?.has_more) && Boolean(firstPage?.next_cursor)}
            sort={sort}
          />
        </>
      )}
    </div>
  );
}
