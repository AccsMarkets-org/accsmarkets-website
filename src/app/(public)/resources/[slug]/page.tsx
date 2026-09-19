import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPost,
  RESOURCES_BASE,
  opinlyImage,
  opinlyImageUrl,
  type FullPost,
} from "@/lib/opinly";
import { ContentRenderer } from "@/components/opinly/ContentRenderer";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://accsmarkets.org";

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  let post: FullPost | null = null;
  try {
    post = await getPost(params.slug);
  } catch {
    return {};
  }
  if (!post) return {};
  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.description || "";
  const url = `${BASE_URL}${RESOURCES_BASE}/${post.slug}`;
  const hero = opinlyImage(post.titleFile);
  const images = hero ? [{ url: hero.src, alt: hero.alt || post.title }] : [{ url: `${BASE_URL}/og-default.png` }];
  return {
    title: `${title} — AccsMarkets`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      siteName: "AccsMarkets",
      images,
      publishedTime: post.firstPublishedAt ?? undefined,
      modifiedTime: post.modifiedAt ?? undefined,
      authors: post.author?.name ? [post.author.name] : undefined,
      tags: post.tags?.map((t) => t.name),
    },
    twitter: { card: "summary_large_image", title, description, images: images.map((i) => i.url) },
  };
}

export default async function ResourcePostPage({ params }: { params: { slug: string } }) {
  let post: FullPost | null;
  try {
    post = await getPost(params.slug);
  } catch {
    // Surface a soft error rather than a hard 500 for transient API issues.
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="font-medium text-foreground">This article couldn&apos;t be loaded right now.</p>
        <Link href={RESOURCES_BASE} className="mt-3 inline-block text-sm text-brand-600 hover:underline">← Back to Resources</Link>
      </div>
    );
  }
  if (!post) notFound();

  const url = `${BASE_URL}${RESOURCES_BASE}/${post.slug}`;
  const hero = opinlyImage(post.titleFile);
  const avatar = opinlyImageUrl(post.author?.fileKey ?? null);
  const published = fmtDate(post.firstPublishedAt);
  const faqs = post.faqs ?? [];
  const tags = post.tags ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graph: any[] = [
    {
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      headline: post.title.slice(0, 110),
      description: post.metaDescription || post.description || "",
      image: hero ? [hero.src] : [`${BASE_URL}/og-default.png`],
      datePublished: post.firstPublishedAt ?? undefined,
      dateModified: post.modifiedAt ?? post.firstPublishedAt ?? undefined,
      author: post.author?.name
        ? { "@type": "Person", name: post.author.name, url: post.author.slug ? `${BASE_URL}${RESOURCES_BASE}/author/${post.author.slug}` : undefined }
        : { "@type": "Organization", name: "AccsMarkets", url: BASE_URL },
      publisher: {
        "@type": "Organization",
        name: "AccsMarkets",
        logo: { "@type": "ImageObject", url: `${BASE_URL}/icons/icon-512.png` },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      keywords: tags.map((t) => t.name).join(", "),
      articleSection: post.category?.name ?? undefined,
      url,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Resources", item: `${BASE_URL}${RESOURCES_BASE}` },
        ...(post.category
          ? [{ "@type": "ListItem", position: 3, name: post.category.name, item: `${BASE_URL}${RESOURCES_BASE}/category/${post.category.slug}` }]
          : []),
        { "@type": "ListItem", position: post.category ? 4 : 3, name: post.title, item: url },
      ],
    },
  ];
  if (faqs.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }
  const jsonLd = { "@context": "https://schema.org", "@graph": graph };

  return (
    <article className="mx-auto max-w-2xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <style>{`article :where(h2,h3){scroll-margin-top:6rem}`}</style>

      <nav aria-label="Breadcrumb" className="mb-5 text-xs text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-brand-600">Home</Link></li>
          <li aria-hidden className="text-muted/50">/</li>
          <li><Link href={RESOURCES_BASE} className="hover:text-brand-600">Resources</Link></li>
          {post.category && (
            <>
              <li aria-hidden className="text-muted/50">/</li>
              <li><Link href={`${RESOURCES_BASE}/category/${post.category.slug}`} className="hover:text-brand-600">{post.category.name}</Link></li>
            </>
          )}
          <li aria-hidden className="text-muted/50">/</li>
          <li className="line-clamp-1 text-foreground/80">{post.title}</li>
        </ol>
      </nav>

      <header>
        <h1 className="mb-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{post.title}</h1>
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
          {post.author?.name && (
            <span className="flex items-center gap-2 font-medium text-foreground">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt={post.author?.name ?? ""} className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                  {post.author.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              {post.author.slug ? (
                <Link href={`${RESOURCES_BASE}/author/${post.author.slug}`} className="hover:text-brand-600">{post.author.name}</Link>
              ) : (
                post.author.name
              )}
            </span>
          )}
          {post.author?.name && published && <span aria-hidden className="text-muted/40">·</span>}
          {published && <time dateTime={post.firstPublishedAt ?? undefined}>{published}</time>}
        </div>
      </header>

      {hero && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={hero.src} alt={hero.alt || post.title} width={1200} height={630} className="mb-7 aspect-[16/9] w-full rounded-2xl object-cover" />
      )}

      <ContentRenderer content={post.content} />

      {faqs.length > 0 && (
        <section aria-labelledby="faq-heading" className="mt-10 border-t border-surface-border pt-8">
          <h2 id="faq-heading" className="mb-4 text-xl font-bold">Frequently asked questions</h2>
          <div className="space-y-2.5">
            {faqs.map((f, i) => (
              <details key={i} className="group rounded-xl border border-surface-border bg-surface px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-foreground marker:hidden">
                  <span className="flex items-center justify-between gap-2">
                    {f.question}
                    <span className="text-muted transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t.slug} className="rounded-full bg-surface-border/60 px-2.5 py-0.5 text-xs text-foreground/70">#{t.name}</span>
          ))}
        </div>
      )}

      <div className="mt-10">
        <Link href={RESOURCES_BASE} className="text-sm text-brand-500 hover:underline">← All resources</Link>
      </div>
    </article>
  );
}
