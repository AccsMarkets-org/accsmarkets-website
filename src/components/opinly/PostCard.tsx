import Link from "next/link";
import { RESOURCES_BASE, opinlyImage, type Post } from "@/lib/opinly";

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function PostCard({ post }: { post: Post }) {
  const img = opinlyImage(post.image);
  const date = formatDate(post.lastPublishedAt ?? post.firstPublishedAt);
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface transition hover:border-brand-300 hover:shadow-sm">
      <Link href={`${RESOURCES_BASE}/${post.slug}`} className="flex h-full flex-col">
        <div className="aspect-[16/9] w-full overflow-hidden bg-surface-border/40">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img.src}
              alt={img.alt}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted">No image</div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          {post.category?.name && (
            <span className="w-fit rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
              {post.category.name}
            </span>
          )}
          <h3 className="line-clamp-2 font-semibold leading-snug text-foreground group-hover:text-brand-600">
            {post.title}
          </h3>
          {post.description && <p className="line-clamp-2 text-sm text-muted">{post.description}</p>}
          <div className="mt-auto flex items-center gap-2 pt-1 text-xs text-muted">
            {post.author?.name && <span className="font-medium text-foreground/80">{post.author.name}</span>}
            {post.author?.name && date && <span aria-hidden>·</span>}
            {date && <time dateTime={post.lastPublishedAt ?? post.firstPublishedAt ?? undefined}>{date}</time>}
          </div>
        </div>
      </Link>
    </article>
  );
}
