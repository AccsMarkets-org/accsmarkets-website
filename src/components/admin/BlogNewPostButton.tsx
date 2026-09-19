"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function BlogNewPostButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");

  async function create() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create post");
      toast.success("Post created");
      router.push(`/admin/blog/${data.post.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creating post");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path d="M12 4v16m8-8H4" />
        </svg>
        New Post
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-background p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-bold">New Blog Post</h2>
            <p className="mb-4 text-sm text-muted">Give your post a title to get started. You can change it later.</p>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") create(); if (e.key === "Escape") setShowModal(false); }}
              placeholder="e.g. How to safely buy Instagram accounts"
              className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none sm:text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium hover:bg-surface-border disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={create}
                disabled={loading}
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {loading ? "Creating…" : "Create & Edit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
