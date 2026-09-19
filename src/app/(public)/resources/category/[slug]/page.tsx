import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPosts, getCategories, RESOURCES_BASE, type Post, type CategorySummary } from "@/lib/opinly";
import { PostCard } from "@/components/opinly/PostCard";
import { LoadMorePosts } from "@/components/opinly/LoadMorePosts";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://accsmarkets.org";

async function loadCategory(slug: string): Promise<CategorySummary | null> {
  try {
    const cats = await getCategories();
    return cats.find((c) => c.slug === slug) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const cat = await loadCategory(params.slug);
  const name = cat?.title ?? params.slug;
  const title = `${name} — Resources — AccsMarkets`;
  const description = cat?.description ?? `Articles in ${name}.`;
  const url = `${BASE_URL}${RESOURCES_BASE}/category/${params.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: "AccsMarkets" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CategoryPage({ params, searchParams }: { params: { slug: string }; searchParams: { sort?: string } }) {
  const sort: "newest" | "oldest" = searchParams.sort === "oldest" ? "oldest" : "newest";

  let firstPage: { data: Post[]; has_more: boolean; next_cursor: string | null } | null = null;
  try {
    firstPage = await getPosts({ limit: 12, category: params.slug, sort });
  } catch {
    firstPage = null;
  }
  const cat = await loadCategory(params.slug);
  const posts = firstPage?.data ?? [];

  // Unknown category with no posts → 404.
  if (!cat && posts.length === 0) notFound();

  const name = cat?.title ?? params.slug;
  const url = `${BASE_URL}${RESOURCES_BASE}/category/${params.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: `${name} — Resources`, description: cat?.description ?? undefined, url },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Resources", item: `${BASE_URL}${RESOURCES_BASE}` },
          { "@type": "ListItem", position: 3, name, item: url },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-brand-600">Home</Link></li>
          <li aria-hidden className="text-muted/50">/</li>
          <li><Link href={RESOURCES_BASE} className="hover:text-brand-600">Resources</Link></li>
          <li aria-hidden className="text-muted/50">/</li>
          <li className="text-foreground/80">{name}</li>
        </ol>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
        {cat?.description && <p className="mt-2 text-muted">{cat.description}</p>}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-surface-border bg-surface p-8 text-center">
          <p className="font-medium text-foreground">No articles in this category yet.</p>
          <Link href={RESOURCES_BASE} className="mt-3 inline-block text-sm text-brand-600 hover:underline">Browse all resources</Link>
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
            category={params.slug}
          />
        </>
      )}
    </div>
  );
}
