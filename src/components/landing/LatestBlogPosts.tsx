import Link from "next/link";
import { prisma } from "@/lib/db";
import { BlogCard } from "@/components/blog/BlogCard";
import { ArrowRight } from "lucide-react";

// Real server-rendered links to the newest posts, directly from the
// homepage — the site's highest-authority, most-frequently-crawled page.
// Previously the only path from "/" to any individual article was via the
// footer's single link to "/blog" itself; a freshly published post had to
// wait for Google to crawl "/blog" (or the sitemap) before it was reachable
// through any real link at all. This gives new posts an immediate, direct
// discovery path.
export async function LatestBlogPosts() {
  const posts = await prisma.blogPost
    .findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { id: true, slug: true, title: true, excerpt: true, coverImage: true, tags: true, publishedAt: true, viewCount: true },
    })
    .catch(() => []);

  if (posts.length === 0) return null;

  return (
    <section aria-labelledby="latest-blog-heading" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="latest-blog-heading" className="text-2xl font-bold text-foreground sm:text-3xl">
            Latest from the blog
          </h2>
          <p className="mt-1.5 text-muted">Guides and tips for buying and selling social media accounts safely.</p>
        </div>
        <Link href="/blog" className="inline-flex items-center gap-1.5 shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-700">
          View all articles
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
