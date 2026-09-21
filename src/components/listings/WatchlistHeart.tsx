"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Heart } from "lucide-react";

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
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save listing"}
      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow backdrop-blur transition hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <Heart
        className={`h-4 w-4 transition-colors ${saved ? "fill-danger text-danger" : "fill-transparent text-muted"}`}
        aria-hidden
      />
    </button>
  );
}
