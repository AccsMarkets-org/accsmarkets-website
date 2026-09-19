"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  coverImage: string | null;
  isAiGen: boolean;
  publishedAt: string | null;
  createdAt: string;
}

const STATUS_COLORS = {
  DRAFT: "bg-warning/10 text-warning",
  PUBLISHED: "bg-success/10 text-success",
  ARCHIVED: "bg-muted/10 text-muted",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";
}

function wordCount(html: string): number {
  return html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

// ─── Cover image drop zone ─────────────────────────────────────────────────
function CoverZone({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setImgError(false); }, [value]);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/blog/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
      toast.success("Cover image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Preview */}
      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt="Cover"
            onError={() => setImgError(true)}
            className={`w-full aspect-[16/9] rounded-xl object-cover border border-surface-border ${imgError ? "invisible" : ""}`}
          />
          {imgError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-warning/50 bg-warning/5 aspect-[16/9]">
              <svg className="h-8 w-8 text-warning/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-xs font-medium text-warning">Image failed to load</p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload new image"}
              </button>
              <button type="button" onClick={() => onChange("")} className="text-xs text-muted hover:text-foreground underline">
                Remove broken URL
              </button>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 rounded-xl bg-black/40 transition-opacity">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-white disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Replace"}
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                className="rounded-lg bg-danger/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-danger"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          disabled={uploading}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 text-sm transition-colors ${
            dragging
              ? "border-brand-400 bg-brand-50"
              : "border-surface-border bg-surface hover:border-brand-300 hover:bg-surface/60"
          } disabled:opacity-50`}
        >
          {uploading ? (
            <span className="text-muted">Uploading…</span>
          ) : (
            <>
              <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-muted">Drop image here or <span className="text-brand-600 font-medium">click to upload</span></span>
              <span className="text-xs text-muted/60">JPG, PNG, WEBP, GIF · Max 10 MB</span>
            </>
          )}
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
      />

      {/* URL paste fallback */}
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste an image URL…"
        className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-base text-muted placeholder:text-muted/50 focus:border-brand-400 focus:outline-none sm:text-xs"
      />
    </div>
  );
}

// ─── Main editor ────────────────────────────────────────────────────────────
export default function BlogEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [insertingImage, setInsertingImage] = useState(false);
  const [slugEditing, setSlugEditing] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("DRAFT");

  // AI regen panel
  const [regen, setRegen] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState("");
  const [regenLoading, setRegenLoading] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/blog/${id}`);
        if (!res.ok) { toast.error("Post not found"); router.push("/admin/blog"); return; }
        const { post: p }: { post: Post } = await res.json();
        setPost(p);
        setTitle(p.title);
        setSlug(p.slug);
        setExcerpt(p.excerpt ?? "");
        setContent(p.content ?? "");
        setTags(p.tags ?? "");
        setCoverImage(p.coverImage ?? "");
        setStatus(p.status);
      } catch {
        toast.error("Failed to load post");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  const words = wordCount(content);
  const readMins = Math.max(1, Math.round(words / 200));

  function autoSlug() {
    if (title && !slugEditing) setSlug(slugify(title));
  }

  async function save(newStatus?: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Untitled Post",
          slug: slug.trim() || undefined,
          excerpt: excerpt.trim(),
          content,
          tags: tags.trim(),
          coverImage: coverImage.trim() || undefined,
          status: newStatus ?? status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      if (newStatus) setStatus(newStatus);
      if (data.post?.slug) setSlug(data.post.slug);
      toast.success(newStatus === "PUBLISHED" ? "Post published!" : "Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving post");
    } finally {
      setSaving(false);
    }
  }

  // Insert an image tag at the textarea cursor
  function insertAtCursor(text: string) {
    const el = contentRef.current;
    if (!el) {
      setContent((c) => c + "\n" + text);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = content.slice(0, start) + text + content.slice(end);
    setContent(next);
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + text.length;
      el.focus();
    }, 0);
  }

  async function uploadInlineImage(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image."); return; }
    setInsertingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/blog/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const imgTag = `<img src="${data.url}" alt="" class="rounded-xl w-full my-4" />`;
      insertAtCursor(imgTag);
      toast.success("Image inserted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setInsertingImage(false);
    }
  }

  async function regenerateSection() {
    if (!regenPrompt.trim()) { toast.error("Describe what to regenerate"); return; }
    setRegenLoading(true);
    try {
      const res = await fetch("/api/admin/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Rewrite/improve this section of a blog post titled "${title}": ${regenPrompt}\n\nCurrent content for context:\n${content.slice(0, 800)}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      toast.success("New version created as a draft — check the blog list.");
      setRegen(false);
      setRegenPrompt("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setRegenLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted text-sm animate-pulse">
        Loading post…
      </div>
    );
  }
  if (!post) return null;

  return (
    <div className="flex flex-col gap-0 -mt-6 -mx-6">
      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-surface-border bg-background/95 backdrop-blur px-6 py-3">
        <Link href="/admin/blog" className="text-sm text-brand-500 hover:underline shrink-0">
          ← Blog
        </Link>
        <span className="text-muted/40">|</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}>
          {status}
        </span>
        {post.isAiGen && (
          <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs text-brand-700">AI</span>
        )}
        <div className="flex-1" />
        <span className="text-xs text-muted hidden sm:block">{words} words · {readMins} min read</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => save("DRAFT")}
            disabled={saving}
            className="rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-border disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Draft"}
          </button>
          {status !== "PUBLISHED" && (
            <button
              onClick={() => save("PUBLISHED")}
              disabled={saving}
              className="rounded-xl bg-success px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Publish
            </button>
          )}
          {status === "PUBLISHED" && (
            <button
              onClick={() => save("ARCHIVED")}
              disabled={saving}
              className="rounded-xl border border-surface-border px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-border disabled:opacity-50"
            >
              Archive
            </button>
          )}
          {slug && (
            <a
              href={`/blog/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-surface-border px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
            >
              View ↗
            </a>
          )}
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 px-6 py-6">
        {/* ── Left: main editor ── */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Title */}
          <div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={autoSlug}
              className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-xl font-bold focus:border-brand-500 focus:outline-none placeholder:text-muted/50"
              placeholder="Post title…"
            />
          </div>

          {/* Slug */}
          <div className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm">
            <span className="text-muted shrink-0 select-none">/blog/</span>
            {slugEditing ? (
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""))}
                onBlur={() => setSlugEditing(false)}
                autoFocus
                className="flex-1 bg-transparent text-base focus:outline-none font-mono text-foreground sm:text-sm"
              />
            ) : (
              <button
                type="button"
                onClick={() => setSlugEditing(true)}
                className="flex-1 text-left font-mono text-foreground/80 hover:text-foreground transition-colors"
                title="Click to edit slug"
              >
                {slug || <span className="text-muted/50">slug…</span>}
              </button>
            )}
            <button
              type="button"
              onClick={() => { setSlug(slugify(title)); setSlugEditing(false); }}
              className="shrink-0 rounded-lg bg-surface-border px-2 py-0.5 text-xs text-muted hover:text-foreground"
              title="Auto-generate from title"
            >
              Auto
            </button>
          </div>

          {/* Excerpt */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Excerpt / Meta description</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-base focus:border-brand-500 focus:outline-none sm:text-sm"
              placeholder="One or two sentences summarising the post…"
            />
          </div>

          {/* Content editor */}
          <div>
            {/* Toolbar */}
            <div className="flex items-center gap-2 rounded-t-xl border border-b-0 border-surface-border bg-surface px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Content (HTML)</span>
              <div className="flex-1" />

              {/* Insert image */}
              <label
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg border border-surface-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-surface-border transition-colors ${insertingImage ? "opacity-50 pointer-events-none" : ""}`}
                title="Upload and insert an image at cursor"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {insertingImage ? "Uploading…" : "Insert Image"}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadInlineImage(f); e.target.value = ""; }}
                />
              </label>

              {/* HTML helpers */}
              <button type="button" onClick={() => insertAtCursor("\n<h2>Heading</h2>\n")} className="rounded-lg border border-surface-border bg-background px-2 py-1 text-xs font-bold hover:bg-surface-border" title="Insert H2">H2</button>
              <button type="button" onClick={() => insertAtCursor("\n<h3>Subheading</h3>\n")} className="rounded-lg border border-surface-border bg-background px-2 py-1 text-xs font-bold hover:bg-surface-border" title="Insert H3">H3</button>
              <button type="button" onClick={() => insertAtCursor("\n<p></p>\n")} className="rounded-lg border border-surface-border bg-background px-2 py-1 text-xs hover:bg-surface-border" title="Insert paragraph">¶</button>
              <button type="button" onClick={() => insertAtCursor("\n<ul>\n  <li></li>\n  <li></li>\n</ul>\n")} className="rounded-lg border border-surface-border bg-background px-2 py-1 text-xs hover:bg-surface-border" title="Insert list">≡</button>
              <button type="button" onClick={() => insertAtCursor('\n<a href="" class="text-brand-600 underline"></a>')} className="rounded-lg border border-surface-border bg-background px-2 py-1 text-xs hover:bg-surface-border" title="Insert link">🔗</button>

              <div className="w-px h-4 bg-surface-border mx-1" />

              {/* Preview toggle */}
              <button
                type="button"
                onClick={() => setPreview(false)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${!preview ? "bg-brand-500 text-white" : "hover:bg-surface-border"}`}
              >Edit</button>
              <button
                type="button"
                onClick={() => setPreview(true)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${preview ? "bg-brand-500 text-white" : "hover:bg-surface-border"}`}
              >Preview</button>
            </div>

            {preview ? (
              <div className="min-h-[480px] rounded-b-xl border border-surface-border bg-white dark:bg-neutral-900 p-6 overflow-y-auto">
                <div
                  className="prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-brand-600 prose-img:rounded-xl"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
            ) : (
              <textarea
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={24}
                spellCheck={false}
                className="w-full rounded-b-xl border border-surface-border bg-surface px-4 py-3 font-mono text-base leading-relaxed focus:border-brand-500 focus:outline-none resize-y sm:text-xs"
                placeholder="<p>Write your post content here in HTML…</p>"
              />
            )}

            <p className="mt-1.5 text-right text-xs text-muted">
              {words.toLocaleString()} words · {readMins} min read
            </p>
          </div>

          {/* AI improve section */}
          <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3">
            <button
              type="button"
              onClick={() => setRegen(!regen)}
              className="text-xs font-semibold text-brand-700 dark:text-brand-400 hover:underline"
            >
              ✨ {regen ? "Close" : "AI: Improve or Expand a Section"}
            </button>
            {regen && (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={regenPrompt}
                  onChange={(e) => setRegenPrompt(e.target.value)}
                  placeholder="e.g. Expand the safety section into 3 detailed paragraphs"
                  className="flex-1 rounded-xl border border-brand-200 dark:border-brand-800 bg-white dark:bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none sm:text-sm"
                />
                <button
                  type="button"
                  onClick={regenerateSection}
                  disabled={regenLoading}
                  className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 shrink-0"
                >
                  {regenLoading ? "Generating…" : "Generate"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: sidebar ── */}
        <div className="flex flex-col gap-4">
          {/* Cover image */}
          <div className="rounded-xl border border-surface-border bg-surface p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Cover Image</h3>
            <CoverZone value={coverImage} onChange={setCoverImage} />
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-surface-border bg-surface p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">Tags</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none sm:text-sm"
              placeholder="instagram, guides, safety"
            />
            <p className="mt-1 text-xs text-muted/60">Comma-separated</p>
            {tags && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                  <span key={t} className="rounded-full bg-surface-border px-2 py-0.5 text-xs text-foreground/70">#{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="rounded-xl border border-surface-border bg-surface p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-full rounded-xl border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none sm:text-sm"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Stats */}
          <div className="rounded-xl border border-surface-border bg-surface p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Stats</h3>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Words</dt>
                <dd className="font-medium">{words.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Read time</dt>
                <dd className="font-medium">~{readMins} min</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Characters</dt>
                <dd className="font-medium">{content.replace(/<[^>]+>/g, "").length.toLocaleString()}</dd>
              </div>
              {post.publishedAt && (
                <div className="flex justify-between">
                  <dt className="text-muted">Published</dt>
                  <dd className="font-medium text-xs">{new Date(post.publishedAt).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Danger zone */}
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-danger/70">Danger Zone</h3>
            <button
              type="button"
              onClick={async () => {
                if (!confirm("Delete this post? This cannot be undone.")) return;
                const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
                if (res.ok) { toast.success("Post deleted"); router.push("/admin/blog"); }
                else toast.error("Failed to delete post");
              }}
              className="w-full rounded-xl border border-danger/30 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
            >
              Delete post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
