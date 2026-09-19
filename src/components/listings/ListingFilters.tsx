"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useRef, useTransition } from "react";
import toast from "react-hot-toast";
import { PLATFORM_LABEL } from "@/lib/constants";
import { PLATFORMS } from "@/lib/validation/listing";
import { Button } from "@/components/ui/Button";

function useDebounce<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function ListingFilters({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [savingSearch, setSavingSearch] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 400);
  const prevQueryRef = useRef(debouncedQuery);

  useEffect(() => {
    if (debouncedQuery === prevQueryRef.current) return;
    prevQueryRef.current = debouncedQuery;
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedQuery) params.set("q", debouncedQuery);
      else params.delete("q");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [debouncedQuery, pathname, router, searchParams]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    setQuery("");
    router.push(pathname);
  }

  const hasFilters =
    searchParams.has("q") ||
    searchParams.has("platform") ||
    searchParams.has("monetized") ||
    searchParams.has("verifiedOnly") ||
    searchParams.has("minPrice") ||
    searchParams.has("maxPrice") ||
    searchParams.has("minFollowers") ||
    searchParams.has("maxFollowers");

  async function saveSearch() {
    if (!saveName.trim()) { toast.error("Enter a name for this search"); return; }
    setSavingSearch(true);
    try {
      const filters: Record<string, string | boolean | number> = {};
      searchParams.forEach((v, k) => { filters[k] = v; });
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: saveName.trim(), filters, alertEnabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Search saved!");
      setShowSaveForm(false);
      setSaveName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingSearch(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="search"
            placeholder="Search listings…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-surface-border bg-surface pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none"
          />
          <span className="pointer-events-none absolute left-3 top-2.5 text-muted text-base">🔍</span>
        </div>

        {/* Mobile filter toggle */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="flex h-10 items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 text-sm font-medium text-muted hover:bg-brand-500/8 sm:hidden"
        >
          Filters {hasFilters && <span className="h-2 w-2 rounded-full bg-brand-500" />}
        </button>

        <select
          value={searchParams.get("sort") ?? "newest"}
          onChange={(e) => updateParam("sort", e.target.value)}
          className="h-10 rounded-xl border border-surface-border bg-surface px-3 text-sm focus:border-brand-400 focus:outline-none"
        >
          <option value="newest">Newest</option>
          <option value="relevance">Most relevant</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="followers">Most followers</option>
        </select>

        {hasFilters && (
          <button onClick={clearAll} className="text-sm text-danger hover:underline">
            Clear all
          </button>
        )}

        {isAuthenticated && hasFilters && !showSaveForm && (
          <button
            onClick={() => setShowSaveForm(true)}
            className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
          >
            🔔 Save search
          </button>
        )}
      </div>

      {/* Save search form */}
      {showSaveForm && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-500/10 p-3 dark:border-brand-800">
          <input
            type="text"
            placeholder="Name this search"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            className="h-9 flex-1 rounded-lg border border-surface-border bg-background px-3 text-sm focus:border-brand-400 focus:outline-none"
          />
          <label className="flex items-center gap-1.5 text-sm text-muted">
            <input
              type="checkbox"
              checked={alertEnabled}
              onChange={(e) => setAlertEnabled(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Alert me on new matches
          </label>
          <Button size="sm" isLoading={savingSearch} onClick={saveSearch}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowSaveForm(false)}>Cancel</Button>
        </div>
      )}

      {/* Desktop filter row + Mobile slide-in */}
      <div className={`flex flex-wrap items-center gap-3 ${sidebarOpen ? "flex" : "hidden sm:flex"}`}>
        <select
          value={searchParams.get("platform") ?? ""}
          onChange={(e) => updateParam("platform", e.target.value)}
          className="h-10 rounded-xl border border-surface-border bg-surface px-3 text-sm focus:border-brand-400 focus:outline-none"
        >
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_LABEL[p]}
            </option>
          ))}
        </select>

        {/* Price range */}
        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted">$</span>
          <input
            type="number"
            placeholder="Min"
            min={0}
            value={searchParams.get("minPrice") ?? ""}
            onChange={(e) => updateParam("minPrice", e.target.value)}
            className="h-10 w-20 rounded-xl border border-surface-border bg-surface px-2 text-sm focus:border-brand-400 focus:outline-none"
          />
          <span className="text-muted">–</span>
          <input
            type="number"
            placeholder="Max"
            min={0}
            value={searchParams.get("maxPrice") ?? ""}
            onChange={(e) => updateParam("maxPrice", e.target.value)}
            className="h-10 w-20 rounded-xl border border-surface-border bg-surface px-2 text-sm focus:border-brand-400 focus:outline-none"
          />
        </div>

        {/* Follower range */}
        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted whitespace-nowrap">Followers</span>
          <input
            type="number"
            placeholder="Min"
            min={0}
            value={searchParams.get("minFollowers") ?? ""}
            onChange={(e) => updateParam("minFollowers", e.target.value)}
            className="h-10 w-20 rounded-xl border border-surface-border bg-surface px-2 text-sm focus:border-brand-400 focus:outline-none"
          />
          <span className="text-muted">–</span>
          <input
            type="number"
            placeholder="Max"
            min={0}
            value={searchParams.get("maxFollowers") ?? ""}
            onChange={(e) => updateParam("maxFollowers", e.target.value)}
            className="h-10 w-20 rounded-xl border border-surface-border bg-surface px-2 text-sm focus:border-brand-400 focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={searchParams.get("verifiedOnly") === "true"}
            onChange={(e) => updateParam("verifiedOnly", e.target.checked ? "true" : "")}
            className="h-4 w-4 rounded border-surface-border text-brand-500 focus:ring-brand-300"
          />
          Verified sellers
        </label>

        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={searchParams.get("monetized") === "true"}
            onChange={(e) => updateParam("monetized", e.target.checked ? "true" : "")}
            className="h-4 w-4 rounded border-surface-border text-brand-500 focus:ring-brand-300"
          />
          Monetized only
        </label>
      </div>
    </div>
  );
}
