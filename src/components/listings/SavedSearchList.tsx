"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { useConfirm } from "@/hooks/useConfirm";
import { Bell, BellOff } from "lucide-react";

interface SavedSearch {
  id: string;
  name: string;
  filters: Record<string, string>;
  alertEnabled: boolean;
  createdAt: Date | string;
}

function filtersToQuery(filters: Record<string, string>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, String(v)); });
  return params.toString();
}

function filtersLabel(filters: Record<string, string>) {
  const parts: string[] = [];
  if (filters.q) parts.push(`"${filters.q}"`);
  if (filters.platform) parts.push(filters.platform);
  if (filters.minPrice || filters.maxPrice) parts.push(`$${filters.minPrice ?? "0"}–${filters.maxPrice ?? "∞"}`);
  if (filters.minFollowers) parts.push(`${Number(filters.minFollowers).toLocaleString()}+ followers`);
  if (filters.monetized === "true") parts.push("Monetized");
  if (filters.verifiedOnly === "true") parts.push("Verified sellers");
  return parts.join(" · ") || "No filters";
}

export function SavedSearchList({ initialSearches }: { initialSearches: SavedSearch[] }) {
  const router = useRouter();
  const [searches, setSearches] = useState(initialSearches);
  const { confirm, ConfirmDialog } = useConfirm();

  async function toggleAlert(id: string, current: boolean) {
    const res = await fetch(`/api/saved-searches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertEnabled: !current }),
    });
    if (res.ok) {
      setSearches((prev) => prev.map((s) => (s.id === id ? { ...s, alertEnabled: !current } : s)));
      toast.success(!current ? "Alerts enabled" : "Alerts disabled");
    } else {
      toast.error("Failed to update alert");
    }
  }

  async function deleteSearch(id: string) {
    const ok = await confirm({ title: "Delete saved search?", description: "This cannot be undone.", confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    const res = await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSearches((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
    } else {
      toast.error("Failed to delete search");
    }
  }

  return (
    <>
    {ConfirmDialog}
    <div className="flex flex-col gap-3">
      {searches.map((s) => (
        <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <a
              href={`/listings?${filtersToQuery(s.filters)}`}
              className="font-semibold text-brand-600 hover:underline"
            >
              {s.name}
            </a>
            <p className="text-xs text-muted">{filtersLabel(s.filters)}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleAlert(s.id, s.alertEnabled)}
              title={s.alertEnabled ? "Disable alerts" : "Enable alerts"}
              aria-label={s.alertEnabled ? "Disable alerts" : "Enable alerts"}
              aria-pressed={s.alertEnabled}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-brand-500/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${s.alertEnabled ? "text-brand-500" : "text-muted"}`}
            >
              {s.alertEnabled ? <Bell className="h-4 w-4 fill-current" aria-hidden /> : <BellOff className="h-4 w-4" aria-hidden />}
            </button>
            <a
              href={`/listings?${filtersToQuery(s.filters)}`}
              className="text-sm text-brand-600 hover:underline"
            >
              Run
            </a>
            <button
              onClick={() => deleteSearch(s.id)}
              className="text-sm text-danger hover:underline"
            >
              Delete
            </button>
          </div>
        </Card>
      ))}
    </div>
    </>
  );
}
