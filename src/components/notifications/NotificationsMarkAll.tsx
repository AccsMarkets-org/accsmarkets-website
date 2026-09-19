"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function NotificationsMarkAll() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function markAll() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { method: "PUT" });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Could not mark as read");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={markAll}
      disabled={loading}
      className="rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:border-brand-300 hover:bg-brand-500/8 transition disabled:opacity-50"
    >
      {loading ? "Marking…" : "Mark all as read"}
    </button>
  );
}
