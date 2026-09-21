import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDate } from "@/lib/utils";
import { BlogGenerateForm } from "@/components/admin/BlogGenerateForm";
import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { BlogTopicQueuePanel } from "@/components/admin/BlogTopicQueuePanel";
import { BlogNewPostButton } from "@/components/admin/BlogNewPostButton";

interface AutoSeoRow {
  autoSeoId: number;
  blogPostId: string;
  slug: string;
  heroImageUrl: string | null;
  heroImageLocal: string | null;
  heroImageAlt: string | null;
  metaDescription: string | null;
  keywords: string | null;
  languageCode: string | null;
  publishedUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AutoSeoWithPost extends AutoSeoRow {
  postTitle: string | null;
  postStatus: string | null;
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: "Draft",     className: "bg-warning/10 text-warning" },
  PUBLISHED: { label: "Published", className: "bg-success/10 text-success" },
  ARCHIVED:  { label: "Archived",  className: "bg-muted/10 text-muted" },
};

export default async function AdminBlogPage() {
  const [posts, queue, logs, rawAutoSeo] = await Promise.all([
    prisma.blogPost.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.blogTopicQueue.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.blogAutomationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, prompt: true, success: true, error: true, tokensIn: true, tokensOut: true, createdAt: true },
    }),
    prisma.$queryRawUnsafe<AutoSeoRow[]>(
      `SELECT autoSeoId, blogPostId, slug, heroImageUrl, heroImageLocal, heroImageAlt,
              metaDescription, keywords, languageCode, publishedUrl, createdAt, updatedAt
       FROM AutoSeoArticle
       ORDER BY updatedAt DESC
       LIMIT 30`
    ).catch(() => [] as AutoSeoRow[]),
  ]);

  // Join AutoSEO rows with BlogPost data in JS to avoid cross-table collation issues
  const autoSeoIds = rawAutoSeo.map((r) => r.blogPostId).filter(Boolean);
  const autoSeoPosts = autoSeoIds.length
    ? await prisma.blogPost.findMany({
        where: { id: { in: autoSeoIds } },
        select: { id: true, title: true, status: true },
      }).catch(() => [])
    : [];
  const postMap = new Map(autoSeoPosts.map((p) => [p.id, p]));
  const autoSeoArticles: AutoSeoWithPost[] = rawAutoSeo.map((r) => ({
    ...r,
    postTitle: postMap.get(r.blogPostId)?.title ?? null,
    postStatus: postMap.get(r.blogPostId)?.status ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Blog</h1>
        <BlogNewPostButton />
      </div>

      {/* AI generation form */}
      <Card>
        <h2 className="mb-3 font-semibold">Generate new post with AI</h2>
        <BlogGenerateForm />
      </Card>

      {/* Auto-blog topic queue */}
      <Card>
        <h2 className="mb-3 font-semibold">Auto-Blog Topic Queue</h2>
        <BlogTopicQueuePanel />
      </Card>

      {/* Automation log */}
      {logs.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold text-sm text-muted uppercase tracking-wide">Recent AI generations</h2>
          <div className="flex flex-col gap-2">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="line-clamp-1 text-muted">{l.prompt}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {l.success
                    ? <StatusPill label="Done" className="bg-success/10 text-success" />
                    : <StatusPill label="Failed" className="bg-danger/10 text-danger" />}
                  <span className="text-xs text-muted">{l.tokensIn ? `${l.tokensIn}+${l.tokensOut} tok` : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AutoSEO Reference */}
      {autoSeoArticles.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <span className="rounded-full bg-purple-100 dark:bg-purple-950/40 px-2 py-0.5 text-xs font-bold text-purple-700 dark:text-purple-400">AutoSEO</span>
              Reference Articles
              <span className="text-xs font-normal text-muted">({autoSeoArticles.length})</span>
            </h2>
            <p className="text-xs text-muted">Compare style &amp; quality with your own posts</p>
          </div>
          <div className="flex flex-col divide-y divide-surface-border">
            {autoSeoArticles.map((a) => {
              const img = a.heroImageLocal || a.heroImageUrl;
              let keywords: string[] = [];
              try { keywords = a.keywords ? JSON.parse(a.keywords).slice(0, 4) : []; } catch { keywords = []; }
              return (
                <div key={a.autoSeoId} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  {/* Thumbnail */}
                  {img ? (
                    <img
                      src={img}
                      alt={a.heroImageAlt ?? ""}
                      className="h-16 w-24 shrink-0 rounded-lg object-cover border border-surface-border"
                    />
                  ) : (
                    <div className="h-16 w-24 shrink-0 rounded-lg bg-surface-border flex items-center justify-center">
                      <svg className="h-5 w-5 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {/* Info */}
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/admin/blog/${a.blogPostId}`} className="text-sm font-medium hover:underline line-clamp-1">
                        {a.postTitle ?? `AutoSEO #${a.autoSeoId}`}
                      </Link>
                      {a.postStatus && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          a.postStatus === "PUBLISHED" ? "bg-success/10 text-success" :
                          a.postStatus === "DRAFT" ? "bg-warning/10 text-warning" :
                          "bg-muted/10 text-muted"
                        }`}>{a.postStatus}</span>
                      )}
                      {a.languageCode && a.languageCode !== "en" && (
                        <span className="rounded-full bg-surface-border px-1.5 py-0.5 text-[10px] text-muted uppercase">{a.languageCode}</span>
                      )}
                    </div>
                    {a.metaDescription && (
                      <p className="text-xs text-muted line-clamp-2">{a.metaDescription}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {keywords.map((k: string) => (
                        <span key={k} className="rounded-full bg-purple-50 dark:bg-purple-950/30 px-1.5 py-0.5 text-[10px] text-purple-700 dark:text-purple-400">#{k}</span>
                      ))}
                      <span className="text-[10px] text-muted/60 ml-auto">{formatDate(new Date(a.updatedAt))}</span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <Link href={`/blog/${a.slug}`} target="_blank" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-surface-border px-2 py-1 text-[10px] font-medium hover:bg-surface-border text-center">
                      View
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                    <Link href={`/admin/blog/${a.blogPostId}`} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-surface-border px-2 py-1 text-[10px] font-medium hover:bg-surface-border text-center">
                      Edit
                    </Link>
                    {a.publishedUrl && (
                      <a href={a.publishedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 px-2 py-1 text-[10px] font-medium text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/50 text-center">
                        Source
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Post list */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{posts.length} post{posts.length !== 1 ? "s" : ""}</h2>
        </div>
        {posts.map((post) => {
          const style = STATUS_STYLE[post.status] ?? STATUS_STYLE.DRAFT;
          return (
            <Card key={post.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/admin/blog/${post.id}`} className="font-medium hover:underline">
                    {post.title}
                  </Link>
                  <Link href={`/blog/${post.slug}`} target="_blank" className="inline-flex items-center rounded text-xs text-muted hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" title="View live" aria-label="View live post"><ExternalLink className="h-3.5 w-3.5" aria-hidden /></Link>
                  <StatusPill label={style.label} className={style.className} />
                  {post.isAiGen && <span className="rounded-full bg-brand-500/10 px-1.5 py-0.5 text-[10px] text-brand-700">AI</span>}
                </div>
                <p className="text-xs text-muted">{formatDate(post.createdAt)} · {post.viewCount} views · /{post.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/blog/${post.id}`}
                  className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium hover:bg-surface-border"
                >
                  Edit
                </Link>
                <AdminActionButtons
                  endpoint={`/api/admin/blog/${post.id}`}
                  actions={
                    post.status === "DRAFT"
                      ? [
                          { label: "Publish", action: "publish", method: "PATCH" as const, body: { status: "PUBLISHED" }, variant: "primary" },
                          { label: "Delete", action: "delete", method: "DELETE" as const, variant: "danger", confirm: "Delete this post?" },
                        ]
                      : post.status === "PUBLISHED"
                        ? [{ label: "Archive", action: "archive", method: "PATCH" as const, body: { status: "ARCHIVED" }, variant: "secondary" }]
                        : [{ label: "Unarchive", action: "unarchive", method: "PATCH" as const, body: { status: "DRAFT" }, variant: "secondary" }]
                  }
                />
              </div>
            </Card>
          );
        })}
        {posts.length === 0 && (
          <div className="rounded-xl border border-dashed border-surface-border p-10 text-center">
            <p className="text-muted text-sm">No posts yet.</p>
            <p className="mt-1 text-muted/60 text-xs">Create one with the button above or generate with AI.</p>
          </div>
        )}
      </div>
    </div>
  );
}
