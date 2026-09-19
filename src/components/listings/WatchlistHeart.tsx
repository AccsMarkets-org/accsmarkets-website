"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Props {
  listingId: string;
  saved: boolean;
}

export function WatchlistHeart({ listingId, saved: initialSaved }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    const next = !saved;
    setSaved(next);
    try {
      const res = next
        ? await fetch("/api/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ listingId }),
          })
        : await fetch(`/api/watchlist/${listingId}`, { method: "DELETE" });
      if (!res.ok) {
        setSaved(!next);
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={saved ? "Remove from saved" : "Save listing"}
      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow backdrop-blur transition hover:scale-110 active:scale-95"
    >
      <svg
        className={`h-4 w-4 transition-colors ${saved ? "fill-danger text-danger" : "fill-transparent text-muted"}`}
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.593C7.37 17.64 2 14.01 2 9.5 2 5.91 4.91 3 8.5 3c1.74 0 3.41.81 4.5 2.09A5.988 5.988 0 0 1 15.5 3C19.09 3 22 5.91 22 9.5c0 4.51-5.37 8.14-10 12.093z" />
      </svg>
    </button>
  );
}
