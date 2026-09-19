import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://accsmarkets.org";

interface FaqItem {
  question: string;
  answer: string;
}
interface TocItem {
  level: number;
  text: string;
  id: string;
}

// ── Text/HTML helpers (server-side) ───────────────────────────────────────────
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "section"
  );
}

// Meta sections AutoSEO includes in-content; excluded from our fallback TOC.
const META_HEADING = /^(key takeaways?|table of contents|frequently asked questions?|faqs?|conclusion)$/i;

// Ensure h2/h3 have ids (reusing any AutoSEO already set) and collect a TOC.
function injectHeadingIds(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const seen = new Map<string, number>();
  const out = html.replace(/<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/gi, (m, lvl, attrs, inner) => {
    const text = stripTags(inner);
    if (!text) return m;
    const existing = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i);
    if (existing) {
      // Keep AutoSEO's own id so its in-content anchor links resolve.
      if (!META_HEADING.test(text)) toc.push({ level: Number(lvl), text, id: existing[1] });
      return m;
    }
    let id = slugifyHeading(text);
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    if (n > 0) id = `${id}-${n + 1}`;
    if (!META_HEADING.test(text)) toc.push({ level: Number(lvl), text, id });
    return `<h${lvl}${attrs} id="${id}">${inner}</h${lvl}>`;
  });
  return { html: out, toc };
}

function readingMinutes(text: string): number {
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return Math.max(1, Math.round(words / 200));
}

function absUrl(u?: string | null): string | null {
  if (!u) return null;
  return u.startsWith("http") ? u : `${BASE_URL}${u.startsWith("/") ? "" : "/"}${u}`;
}

// AutoSEO-enriched fields (FAQ, keywords, hero alt, infographic) live in a
// separate table not modelled in Prisma — read via raw SQL, degrade gracefully.
async function getSeoExtras(blogPostId: string) {
  const rows = await prisma
    .$queryRawUnsafe<
      {
        faqSchema: string | null;
        keywords: string | null;
        heroImageAlt: string | null;
        infographicImageLocal: string | null;
        metaDescription: string | null;
        languageCode: string | null;
      }[]
    >(
      "SELECT `faqSchema`,`keywords`,`heroImageAlt`,`infographicImageLocal`,`metaDescription`,`languageCode` FROM `AutoSeoArticle` WHERE `blogPostId` = ? LIMIT 1",
      blogPostId,
    )
    .catch(() => []);
  const r = rows[0];
  if (!r) return null;
  let faqs: FaqItem[] = [];
  try {
    const parsed = r.faqSchema ? JSON.parse(r.faqSchema) : [];
    if (Array.isArray(parsed)) {
      faqs = parsed
        .filter((f) => f && typeof f.question === "string" && typeof f.answer === "string")
        .map((f) => ({ question: String(f.question), answer: String(f.answer) }));
    }
  } catch {}
  let keywords: string[] = [];
  try {
    const parsed = r.keywords ? JSON.parse(r.keywords) : [];
    if (Array.isArray(parsed)) keywords = parsed.map(String);
  } catch {}
  return {
    faqs,
    keywords,
    heroImageAlt: r.heroImageAlt,
    infographic: r.infographicImageLocal,
    metaDescription: r.metaDescription,
    languageCode: r.languageCode || "en",
  };
}

// ── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug: params.slug, status: "PUBLISHED" },
      select: { title: true, excerpt: true, coverImage: true, slug: true, tags: true, publishedAt: true, updatedAt: true },
    });
    if (!post) return {};
    // Bare title here — the root layout's `template: "%s — AccsMarkets"` adds
    // the site suffix once. Returning the full "X — AccsMarkets Blog" string
    // got run through that template too, doubling it in the actual <title>
    // tag ("X — AccsMarkets Blog — AccsMarkets"). OG/Twitter titles aren't
    // template-processed, so they keep the richer social-preview form.
    const title = post.title;
    const socialTitle = `${post.title} — AccsMarkets Blog`;
    const description = post.excerpt ?? "";
    const url = `${BASE_URL}/blog/${post.slug}`;
    const img = absUrl(post.coverImage) ?? `${BASE_URL}/og-default.png`;
    const tags = post.tags ? post.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    return {
      title,
      description,
      keywords: tags.length ? tags : undefined,
      authors: [{ name: "AccsMarkets" }],
      alternates: { canonical: url },
      openGraph: {
        title: socialTitle,
        description,
        url,
        type: "article",
        siteName: "AccsMarkets",
        images: [{ url: img, width: 1200, height: 630, alt: post.title }],
        publishedTime: post.publishedAt?.toISOString(),
        modifiedTime: post.updatedAt?.toISOString(),
        authors: ["AccsMarkets"],
        tags,
      },
      twitter: { card: "summary_large_image" as const, title: socialTitle, description, images: [img] },
    };
  } catch {
    return {};
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  let post;
  try {
    post = await prisma.blogPost.findUnique({ where: { slug: params.slug, status: "PUBLISHED" } });
  } catch {
    notFound();
  }
  if (!post) notFound();

  // Fire-and-forget view count
  prisma.blogPost.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const [seo, related] = await Promise.all([
    getSeoExtras(post.id),
    prisma.blogPost
      .findMany({
        where: { status: "PUBLISHED", id: { not: post.id } },
        orderBy: { publishedAt: "desc" },
        take: 3,
        select: { slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true },
      })
      .catch(() => []),
  ]);

  const tags = post.tags ? post.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const cleanHtml = sanitizeHtml(post.content);
  // AutoSEO content ships its own styled Key Takeaways + Table of Contents;
  // detect them so we don't render duplicate blocks of our own.
  const hasOwnTakeaways = /class="[^"]*key-takeaways/i.test(cleanHtml);
  const hasOwnToc = /id="table-of-contents"/i.test(cleanHtml);
  const { html: contentHtml, toc } = injectHeadingIds(cleanHtml);
  const plain = stripTags(cleanHtml);
  const minutes = readingMinutes(plain);
  const wordCount = plain ? plain.split(/\s+/).filter(Boolean).length : 0;
  const url = `${BASE_URL}/blog/${post.slug}`;
  const heroImg = absUrl(post.coverImage);
  const heroAlt = seo?.heroImageAlt || post.title;
  const summary = seo?.metaDescription || post.excerpt || "";
  const lang = seo?.languageCode || "en";
  const faqs = seo?.faqs ?? [];
  const publishedISO = post.publishedAt?.toISOString() ?? post.createdAt.toISOString();
  const modifiedISO = post.updatedAt.toISOString();

  // ── Structured data (single @graph: Article + Breadcrumb + FAQ) ──────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graph: any[] = [
    {
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      headline: post.title.slice(0, 110),
      name: post.title,
      description: summary,
      image: heroImg ? [heroImg] : [`${BASE_URL}/og-default.png`],
      datePublished: publishedISO,
      dateModified: modifiedISO,
      author: { "@type": "Organization", name: "AccsMarkets", url: BASE_URL },
      publisher: {
        "@type": "Organization",
        name: "AccsMarkets",
        logo: { "@type": "ImageObject", url: `${BASE_URL}/icons/icon-512.png` },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      keywords: (tags.length ? tags : seo?.keywords ?? []).join(", "),
      articleSection: tags[0] ?? "Guides",
      wordCount,
      inLanguage: lang,
      url,
      isAccessibleForFree: true,
      speakable: { "@type": "SpeakableSpecification", cssSelector: ["h1", "#tldr"] },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
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
    <article lang={lang} className="mx-auto max-w-6xl px-4 lg:px-8 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      {/* Anchor offset + styling for AutoSEO's in-content Key Takeaways / TOC boxes */}
      <style>{`
article :where(h2,h3){scroll-margin-top:6rem}
article .key-takeaways{margin:1.75rem 0;border:1px solid hsl(24 95% 53% / .28);background:hsl(24 95% 53% / .07);border-radius:1rem;padding:1.15rem 1.45rem}
article .key-takeaways h2{margin:0 0 .55rem;font-size:.72rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:hsl(24 88% 45%)}
article .key-takeaways ul{margin:0;padding-left:1.15rem}
article .key-takeaways li{margin:.4rem 0}
article #table-of-contents{margin:2rem 0 .5rem;font-size:.72rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:inherit;opacity:.55}
article #table-of-contents + ul,article #table-of-contents + ol{margin:0 0 1.75rem;padding:.9rem 1.25rem .9rem 2.2rem;border:1px solid hsl(var(--surface-border));background:hsl(var(--surface));border-radius:1rem}
article #table-of-contents + ul li,article #table-of-contents + ol li{margin:.3rem 0}
@media (min-width:1024px){article #table-of-contents,article #table-of-contents + ul,article #table-of-contents + ol{display:none}}
`}</style>

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-5 text-xs text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-brand-600">Home</Link></li>
          <li aria-hidden className="text-muted/50">/</li>
          <li><Link href="/blog" className="hover:text-brand-600">Blog</Link></li>
          <li aria-hidden className="text-muted/50">/</li>
          <li className="line-clamp-1 text-foreground/80">{post.title}</li>
        </ol>
      </nav>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-12">
      <div className="min-w-0">
      <header>
        <h1 className="mb-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{post.title}</h1>

        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">AM</span>
            AccsMarkets
          </span>
          <span aria-hidden className="text-muted/40">·</span>
          {post.publishedAt && (
            <time dateTime={publishedISO}>{formatDate(post.publishedAt)}</time>
          )}
          <span aria-hidden className="text-muted/40">·</span>
          <span>{minutes} min read</span>
          {post.isAiGen && (
            <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-700">AI-assisted</span>
          )}
        </div>
      </header>

      {post.coverImage && (
        // This is the LCP element on almost every article page — `priority` skips
        // lazy-loading and preloads it, and next/image gets it AVIF/WebP + resized
        // instead of shipping the original file straight through.
        <Image
          src={post.coverImage}
          alt={heroAlt}
          width={1200}
          height={630}
          priority
          sizes="(max-width: 1024px) 100vw, 768px"
          className="mb-6 aspect-[16/9] w-full rounded-2xl object-cover"
        />
      )}

      {/* TL;DR — concise, AI-quotable summary (marked speakable).
          Skipped when AutoSEO content already includes a Key Takeaways box. */}
      {!hasOwnTakeaways && summary && (
        <div id="tldr" className="mb-7 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-brand-600">Key takeaway</p>
          <p className="text-sm leading-relaxed text-foreground">{summary}</p>
        </div>
      )}

      {/* Table of contents — only when AutoSEO didn't ship its own (mobile; sidebar handles desktop). */}
      {!hasOwnToc && toc.length >= 3 && (
        <nav aria-label="Table of contents" className="mb-8 rounded-2xl border border-surface-border bg-surface p-4 lg:hidden">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted">On this page</p>
          <ol className="space-y-1.5 text-sm">
            {toc.map((t) => (
              <li key={t.id} className={t.level === 3 ? "ml-4" : ""}>
                <a href={`#${t.id}`} className="text-foreground/80 transition hover:text-brand-600">{t.text}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Article body — prose-lg on desktop for genuine reading comfort, not the
          cramped prose-sm this used to ship with the (previously-uninstalled)
          typography plugin. */}
      <div
        className="prose prose-base lg:prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      {/* Infographic */}
      {seo?.infographic && (
        <figure className="my-8">
          {/* eslint-disable-next-line @next/next/no-img-element -- variable aspect
              ratio per article; next/image needs known dimensions to avoid
              distortion. Not an LCP candidate (below the fold), so explicit
              lazy-loading covers the real win here. */}
          <img
            src={seo.infographic}
            alt={`${post.title} infographic`}
            loading="lazy"
            decoding="async"
            className="w-full rounded-2xl border border-surface-border"
          />
          <figcaption className="mt-2 text-center text-xs text-muted">Infographic: {post.title}</figcaption>
        </figure>
      )}

      {/* FAQ — visible + FAQPage schema above */}
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

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t} className="rounded-full bg-surface-border/60 px-2.5 py-0.5 text-xs text-foreground/70">#{t}</span>
          ))}
        </div>
      )}

      {/* Conversion CTA (also internal-links to the marketplace) */}
      <div className="mt-10 flex flex-col items-start gap-2 rounded-2xl border border-brand-100 bg-brand-50/40 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-foreground">Ready to buy or sell an account?</p>
          <p className="text-sm text-muted">Browse verified listings, protected by escrow.</p>
        </div>
        <Link href="/listings" className="shrink-0 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600">
          Explore the marketplace →
        </Link>
      </div>

      {/* Related posts */}
      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-12 border-t border-surface-border pt-8">
          <h2 id="related-heading" className="mb-4 text-lg font-bold">Related reading</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link key={r.slug} href={`/blog/${r.slug}`} className="group flex flex-col rounded-xl border border-surface-border bg-surface p-3 transition hover:border-brand-300">
                {r.coverImage && (
                  <img src={r.coverImage} alt={r.title} className="mb-2 aspect-[16/9] w-full rounded-lg object-cover" />
                )}
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-brand-600">{r.title}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10">
        <Link href="/blog" className="text-sm text-brand-500 hover:underline">← All posts</Link>
      </div>
      </div>{/* /main column */}

      {toc.length >= 3 && (
        <aside className="hidden lg:block">
          <nav aria-label="Table of contents" className="sticky top-24 rounded-2xl border border-surface-border bg-surface p-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted">On this page</p>
            <ol className="space-y-1.5 text-sm">
              {toc.map((t) => (
                <li key={t.id} className={t.level === 3 ? "ml-3" : ""}>
                  <a href={`#${t.id}`} className="block text-foreground/70 transition hover:text-brand-600">{t.text}</a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
      )}
      </div>{/* /grid */}
    </article>
  );
}
