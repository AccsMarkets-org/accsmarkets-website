"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Check, Plus } from "lucide-react";

interface FollowButtonProps {
  sellerId: string;
  sellerUsername: string;
  initialFollowing: boolean;
  initialCount: number;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

export function FollowButton({
  sellerId: _sellerId,
  sellerUsername,
  initialFollowing,
  initialCount,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);

  async function handleClick() {
    if (loading) return;

    const wasFollowing = following;
    const prevCount = count;

    // Optimistic update
    setFollowing(!wasFollowing);
    setCount(wasFollowing ? count - 1 : count + 1);
    setLoading(true);

    try {
      const res = await fetch(`/api/sellers/${sellerUsername}/follow`, {
        method: wasFollowing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? data?.message ?? "Something went wrong");
      }
    } catch (err) {
      // Revert optimistic update
      setFollowing(wasFollowing);
      setCount(prevCount);
      toast.error(err instanceof Error ? err.message : "Failed to update follow status");
    } finally {
      setLoading(false);
    }
  }

  const buttonLabel = following ? (
    hovered ? (
      "Unfollow"
    ) : (
      <>
        <Check className="h-4 w-4" aria-hidden />
        Following
      </>
    )
  ) : (
    <>
      <Plus className="h-4 w-4" aria-hidden />
      Follow
    </>
  );

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        disabled={loading}
        aria-pressed={following}
        aria-label={following ? "Unfollow seller" : "Follow seller"}
        className={[
          "inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
          following
            ? hovered
              ? "border border-red-500 bg-transparent text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
              : "border border-surface-border bg-transparent text-foreground hover:border-brand-500"
            : "border border-transparent bg-brand-500 text-white hover:bg-brand-600",
        ].join(" ")}
      >
        {loading ? (
          <span className="flex items-center gap-1.5">
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            {following ? "Unfollowing…" : "Following…"}
          </span>
        ) : (
          buttonLabel
        )}
      </button>

      <span className="text-sm text-muted">
        {formatCount(count)} {count === 1 ? "follower" : "followers"}
      </span>
    </div>
  );
}
