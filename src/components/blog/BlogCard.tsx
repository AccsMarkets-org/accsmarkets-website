"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDate } from "@/lib/utils";

// Gradient placeholders keyed by first char of slug for variety
const GRADIENTS = [
  "from-brand-400 to-brand-600",
  "from-purple-400 to-pink-500",
  "from-emerald-400 to-teal-600",
  "from-orange-400 to-rose-500",
  "from-sky-400 to-indigo-600",
  "from-yellow-400 to-orange-500",
];

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  tags: string | null;
  publishedAt: Date | string | null;
  viewCount: number;
}

export function BlogCard({ post }: { post: Post }) {
  const [imgError, setImgError] = useState(false);
  const gradientIdx = post.slug.charCodeAt(0) % GRADIENTS.length;
  const showImage = post.coverImage && !imgError;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-2xl border border-surface-border bg-surface overflow-hidden transition hover:border-brand-300 hover:shadow-md"
    >
      {/* Cover image — always rendered, either real img or gradient placeholder */}
      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-surface-border">
        {showImage ? (
          <img
            src={post.coverImage!}
            alt={post.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${GRADIENTS[gradientIdx]}`}
          >
            <svg className="h-12 w-12 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h4" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="mb-1.5 line-clamp-2 font-semibold leading-snug group-hover:text-brand-600">
          {post.title}
        </h2>
        <p className="mb-3 line-clamp-2 text-sm text-muted">{post.excerpt}</p>

        <div className="mt-auto flex items-center justify-between text-xs text-muted">
          <span>{post.publishedAt ? formatDate(post.publishedAt) : ""}</span>
          <span>{post.viewCount.toLocaleString()} views</span>
        </div>

        {post.tags && (
          <div className="mt-2 flex flex-wrap gap-1">
            {post.tags.split(",").map((t: string) => t.trim()).filter(Boolean).slice(0, 2).map((t: string) => (
              <span key={t} className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs text-brand-700 dark:text-brand-400 dark:bg-brand-950 dark:text-brand-300">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
