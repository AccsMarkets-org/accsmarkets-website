import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthor, RESOURCES_BASE, opinlyImage, type Author } from "@/lib/opinly";
import { PostCard } from "@/components/opinly/PostCard";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://accsmarkets.org";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  let author: Author | null = null;
  try {
    author = await getAuthor(params.slug);
  } catch {
    return {};
  }
  if (!author) return {};
  const title = `${author.name} — Resources — AccsMarkets`;
  const description = author.bio || `Articles by ${author.name}.`;
  const url = `${BASE_URL}${RESOURCES_BASE}/author/${author.slug}`;
  const img = opinlyImage(author.image);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "profile", siteName: "AccsMarkets", images: img ? [{ url: img.src }] : undefined },
    twitter: { card: "summary", title, description, images: img ? [img.src] : undefined },
  };
}

export default async function AuthorPage({ params }: { params: { slug: string } }) {
  let author: Author | null;
  try {
    author = await getAuthor(params.slug);
  } catch {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="font-medium text-foreground">This author page couldn&apos;t be loaded right now.</p>
        <Link href={RESOURCES_BASE} className="mt-3 inline-block text-sm text-brand-600 hover:underline">← Back to Resources</Link>
      </div>
    );
  }
  if (!author) notFound();

  const img = opinlyImage(author.image);
  const url = `${BASE_URL}${RESOURCES_BASE}/author/${author.slug}`;
  const posts = author.posts ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        url,
        mainEntity: { "@type": "Person", name: author.name, description: author.bio ?? undefined, image: img?.src },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Resources", item: `${BASE_URL}${RESOURCES_BASE}` },
          { "@type": "ListItem", position: 3, name: author.name, item: url },
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
          <li className="text-foreground/80">{author.name}</li>
        </ol>
      </nav>

      <header className="mb-8 flex items-center gap-4">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.src} alt={img.alt || author.name} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-xl font-bold text-white">
            {author.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{author.name}</h1>
          {author.bio && <p className="mt-1 max-w-xl text-sm text-muted">{author.bio}</p>}
        </div>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-surface-border bg-surface p-8 text-center">
          <p className="font-medium text-foreground">No articles by this author yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
