"use client";

import { useState } from "react";
import { PostCard } from "@/components/opinly/PostCard";
import { Button } from "@/components/ui/Button";
import type { Post } from "@/lib/opinly";

interface Props {
  initialCursor: string | null;
  initialHasMore: boolean;
  sort: "newest" | "oldest";
  category?: string;
  author?: string;
}

// Renders additional pages fetched via the /api/resources/posts proxy, appended
// below the server-rendered first page.
export function LoadMorePosts({ initialCursor, initialHasMore, sort, category, author }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError(false);
    try {
      const q = new URLSearchParams({ sort });
      if (cursor) q.set("cursor", cursor);
      if (category) q.set("category", category);
      if (author) q.set("author", author);
      const res = await fetch(`/api/resources/posts?${q.toString()}`);
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { data: Post[]; has_more: boolean; next_cursor: string | null };
      setPosts((prev) => [...prev, ...(data.data ?? [])]);
      setCursor(data.next_cursor);
      setHasMore(Boolean(data.has_more) && Boolean(data.next_cursor));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {posts.length > 0 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-6 text-center text-sm text-danger">
          Couldn&apos;t load more posts. Please try again.
        </p>
      )}

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <Button onClick={loadMore} isLoading={loading} variant="outline">
            Load more articles
          </Button>
        </div>
      )}
    </>
  );
}
