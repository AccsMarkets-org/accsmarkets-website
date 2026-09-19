// Opinly content API client. SERVER-ONLY: the API key is read from
// process.env.OPINLY_API_KEY and must never reach the browser bundle.
// Content is published at /resources on this site.

const API_BASE = process.env.OPINLY_API_BASE ?? "https://sdk.opinly.ai/v1";
const CDN_BASE = process.env.OPINLY_CDN_BASE ?? "https://cdn.opinly.ai/uA-vJB8ByvdduPLo3kn9y";

// Where Opinly content lives on this site (coexists with the AutoSEO blog at /blog).
export const RESOURCES_BASE = "/resources";

// ── Types (from the Opinly OpenAPI schema) ────────────────────────────────────
export interface OpinlyImage {
  fileKey?: string | null;
  alt?: string | null;
  altText?: string | null;
  title?: string | null;
  caption?: string | null;
}
export interface PostCategory {
  slug: string;
  name: string;
  description?: string | null;
}
export interface PostAuthor {
  name: string;
  slug: string;
  fileKey?: string | null;
  bio?: string | null;
}
export interface PostTag {
  slug: string;
  name: string;
}
export interface Post {
  slug: string;
  title: string;
  description?: string | null;
  firstPublishedAt?: string | null;
  lastPublishedAt?: string | null;
  image?: OpinlyImage | null;
  category?: PostCategory | null;
  author?: PostAuthor | null;
  tags?: PostTag[] | null;
}
export interface ContentNode {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attrs?: Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marks?: { type: string; attrs?: Record<string, any> | null }[] | null;
  text?: string | null;
  content?: ContentNode[] | null;
}
export interface FaqItem {
  question: string;
  answer: string;
}
export interface FullPost {
  content?: ContentNode | null;
  title: string;
  slug: string;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  titleFile?: OpinlyImage | null;
  images?: OpinlyImage[] | null;
  firstPublishedAt?: string | null;
  modifiedAt?: string | null;
  author?: PostAuthor | null;
  category?: PostCategory | null;
  tags?: PostTag[] | null;
  faqs?: FaqItem[] | null;
}
export interface PostList {
  data: Post[];
  has_more: boolean;
  next_cursor: string | null;
}
export interface ContentRoute {
  type: "home" | "post" | "category" | "author" | "tag";
  slug: string;
  lastModified: string;
}
export interface CategorySummary {
  slug: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  posts: Post[];
}
export interface Author {
  name: string;
  slug: string;
  image?: OpinlyImage | null;
  bio?: string | null;
  posts?: Post[] | null;
}
export interface RssItem {
  slug: string;
  title: string;
  description: string;
  date: string;
  categories: string[];
}

// ── Image helpers — render fields exactly as the API returns them, resolving a
// bare fileKey against the CDN base (absolute URLs are passed through). ─────────
export function opinlyImageUrl(value?: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `${CDN_BASE}/${value.replace(/^\//, "")}`;
}
export function opinlyImage(img?: OpinlyImage | null): { src: string; alt: string } | null {
  const src = opinlyImageUrl(img?.fileKey ?? null);
  if (!src) return null;
  return { src, alt: img?.alt ?? img?.altText ?? img?.title ?? "" };
}

// ── Fetching ──────────────────────────────────────────────────────────────────
export class OpinlyError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function opinlyFetch<T>(path: string, opts?: { revalidate?: number }): Promise<T> {
  const key = process.env.OPINLY_API_KEY;
  if (!key) throw new OpinlyError("OPINLY_API_KEY is not configured", 500);
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    // ISR + a shared cache tag so the webhook can revalidate everything at once.
    next: { revalidate: opts?.revalidate ?? 600, tags: ["opinly"] },
  });
  if (!res.ok) throw new OpinlyError(`Opinly ${path} -> HTTP ${res.status}`, res.status);
  return (await res.json()) as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && Array.isArray(data.data)) return data.data as T[];
  return [];
}

export async function getPosts(
  params: { limit?: number; cursor?: string; category?: string; author?: string; sort?: "newest" | "oldest" } = {},
): Promise<PostList> {
  const q = new URLSearchParams();
  q.set("limit", String(params.limit ?? 12));
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.category) q.set("category", params.category);
  if (params.author) q.set("author", params.author);
  if (params.sort) q.set("sort", params.sort);
  return opinlyFetch<PostList>(`/content/posts?${q.toString()}`);
}

export async function getPost(slug: string): Promise<FullPost | null> {
  try {
    return await opinlyFetch<FullPost>(`/content/post?slug=${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof OpinlyError && e.status === 404) return null;
    throw e;
  }
}

export async function getRoutes(): Promise<ContentRoute[]> {
  const data = await opinlyFetch<unknown>(`/content/routes`, { revalidate: 300 });
  return unwrap<ContentRoute>(data);
}

export async function getCategories(): Promise<CategorySummary[]> {
  const data = await opinlyFetch<unknown>(`/content/categories`);
  return unwrap<CategorySummary>(data);
}

export async function getAuthors(): Promise<Author[]> {
  const data = await opinlyFetch<unknown>(`/content/authors`);
  return unwrap<Author>(data);
}

export async function getAuthor(slug: string): Promise<Author | null> {
  try {
    const data = await opinlyFetch<{ type?: string; data?: Author | null }>(`/content/authors/${encodeURIComponent(slug)}`);
    if (!data || data.type === "not-found" || !data.data) return null;
    return data.data;
  } catch (e) {
    if (e instanceof OpinlyError && e.status === 404) return null;
    throw e;
  }
}

export async function getRss(limit = 20): Promise<RssItem[]> {
  const data = await opinlyFetch<unknown>(`/content/rss?limit=${limit}`, { revalidate: 900 });
  return unwrap<RssItem>(data);
}
