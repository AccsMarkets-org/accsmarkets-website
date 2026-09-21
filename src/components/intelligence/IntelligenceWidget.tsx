"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type {
  ListingInsights,
  Recommendations,
  RiskAnalysis,
  PricingSuggestion,
  MarketTrends,
} from "@/lib/intelligence";

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = "trends" | "recommendations" | "price" | "listing";

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <svg className="h-7 w-7 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
      {msg}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: "green" | "yellow" | "red" | "blue" | "gray" }) {
  const colors = {
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    gray: "bg-surface text-muted",
  };
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", colors[color])}>
      {label}
    </span>
  );
}

// ─── Trends Panel ─────────────────────────────────────────────────────────────

function TrendsPanel() {
  const [data, setData] = useState<MarketTrends | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/intelligence?action=trends")
      .then((r) => r.json())
      .then((j) => { if (j.error) throw new Error(j.error); setData(j.data); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg msg={error} />;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-brand-200 bg-brand-500/5 p-4 text-sm text-foreground">
        <p className="font-medium text-brand-700 dark:text-brand-300 mb-1">Market Snapshot</p>
        <p className="text-muted">{data.aiInsight}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Active Listings", value: data.totalActiveListings.toLocaleString() },
          { label: "Total Sales", value: data.totalCompletedEscrows.toLocaleString() },
          { label: "Avg Sale Value", value: `$${data.avgEscrowValue.toLocaleString()}` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-surface-border bg-surface p-3 text-center">
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-surface-border bg-surface p-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Last 7 Days</p>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="font-bold text-foreground">{data.recentActivity.newListings7d}</p>
            <p className="text-xs text-muted">New Listings</p>
          </div>
          <div>
            <p className="font-bold text-foreground">{data.recentActivity.completedEscrows7d}</p>
            <p className="text-xs text-muted">Sales</p>
          </div>
          <div>
            <p className="font-bold text-foreground">${data.recentActivity.avgSalePrice7d.toLocaleString()}</p>
            <p className="text-xs text-muted">Avg Price</p>
          </div>
        </div>
      </div>

      {data.topPlatforms.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Top Platforms</p>
          <div className="flex flex-col gap-1.5">
            {data.topPlatforms.slice(0, 5).map((p) => (
              <div key={p.platform} className="flex items-center justify-between rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm">
                <span className="font-medium text-foreground">{p.platform}</span>
                <div className="flex gap-3 text-xs text-muted">
                  <span>{p.listingCount} listed</span>
                  <span className="font-semibold text-brand-600">${p.avgPrice.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Recommendations Panel ────────────────────────────────────────────────────

function RecommendationsPanel() {
  const [data, setData] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/intelligence?action=recommendations")
      .then((r) => r.json())
      .then((j) => { if (j.error) throw new Error(j.error); setData(j.data); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg msg={error} />;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      {data.insight && (
        <div className="rounded-xl border border-brand-200 bg-brand-500/5 p-4 text-sm text-muted">
          <p className="font-medium text-brand-700 dark:text-brand-300 mb-1">For You</p>
          {data.insight}
        </div>
      )}
      {data.listings.length === 0 ? (
        <p className="text-sm text-muted py-4 text-center">No recommendations yet. Keep browsing to personalize your feed.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.listings.map((l) => (
            <a
              key={l.id}
              href={`/listings/${l.id}`}
              className="flex flex-col gap-1 rounded-xl border border-surface-border bg-surface p-3 hover:border-brand-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground truncate">{l.title}</span>
                <span className="ml-2 shrink-0 text-sm font-bold text-brand-600">${l.price.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge label={l.platform} color="blue" />
                <span className="text-xs text-muted">{l.reason}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Price Suggestion Panel ───────────────────────────────────────────────────

const PLATFORMS = ["YOUTUBE", "INSTAGRAM", "TIKTOK", "TELEGRAM", "TWITTER_X", "FACEBOOK", "SNAPCHAT", "PINTEREST", "LINKEDIN", "WEBSITE"] as const;

function PricePanel() {
  const [platform, setPlatform] = useState("INSTAGRAM");
  const [followers, setFollowers] = useState("");
  const [monetized, setMonetized] = useState(false);
  const [niche, setNiche] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PricingSuggestion | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const f = parseInt(followers.replace(/,/g, ""), 10);
    if (!f || isNaN(f) || f < 1) { setError("Enter a valid follower count."); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, followers: f, monetized, niche: niche || undefined }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setResult(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const confidenceColor = result?.confidence === "high" ? "green" : result?.confidence === "medium" ? "yellow" : "gray";

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-background px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p.replace("_", "/")}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1">Followers</label>
          <input
            type="text"
            value={followers}
            onChange={(e) => setFollowers(e.target.value)}
            placeholder="e.g. 50000"
            className="w-full rounded-xl border border-surface-border bg-background px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1">Niche (optional)</label>
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g. Gaming, Fitness"
            className="w-full rounded-xl border border-surface-border bg-background px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
          />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <div
            onClick={() => setMonetized((v) => !v)}
            className={cn(
              "relative h-5 w-9 rounded-full transition-colors",
              monetized ? "bg-brand-500" : "bg-surface-border"
            )}
          >
            <span className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
              monetized ? "translate-x-4" : "translate-x-0.5"
            )} />
          </div>
          <span className="text-sm text-foreground">Monetized account</span>
        </label>

        {error && <ErrorMsg msg={error} />}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-60"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing…
            </>
          ) : (
            "Get Price Suggestion"
          )}
        </button>
      </form>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-col gap-3"
          >
            <div className="rounded-xl border border-brand-200 bg-brand-500/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">Suggested Price</p>
                <Badge label={result.confidence + " confidence"} color={confidenceColor as "green" | "yellow" | "gray"} />
              </div>
              <p className="text-3xl font-black text-brand-600">${result.suggestedPrice.toLocaleString()}</p>
              <p className="text-xs text-muted mt-1">
                Range: ${result.priceRange.min.toLocaleString()} – ${result.priceRange.max.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-surface-border bg-surface p-3 text-sm text-muted">
              <p className="font-medium text-foreground mb-1">Rationale</p>
              {result.rationale}
            </div>
            <p className="text-xs text-muted text-center">Based on {result.comparables} comparable sales</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Listing Analysis Panel ───────────────────────────────────────────────────

function ListingAnalysisPanel() {
  const [listingId, setListingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ListingInsights | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!listingId.trim()) { setError("Enter a listing ID."); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listingId.trim() }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setResult(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const priceColor = result?.priceAssessment === "underpriced" ? "green"
    : result?.priceAssessment === "overpriced" ? "red" : "blue";

  const demandColor = result?.demandLevel === "high" ? "green"
    : result?.demandLevel === "medium" ? "yellow" : "gray";

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleAnalyze} className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Listing ID</label>
          <input
            type="text"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            placeholder="Paste listing ID here"
            className="w-full rounded-xl border border-surface-border bg-background px-3 py-2 text-sm font-mono focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
          />
        </div>
        {error && <ErrorMsg msg={error} />}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-60"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing…
            </>
          ) : (
            "Analyze Listing"
          )}
        </button>
      </form>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-col gap-3"
          >
            <div className="flex gap-2 flex-wrap">
              <Badge label={result.priceAssessment} color={priceColor as "green" | "red" | "blue"} />
              <Badge label={`${result.demandLevel} demand`} color={demandColor as "green" | "yellow" | "gray"} />
              <Badge label={`$${result.suggestedPriceRange.min}–$${result.suggestedPriceRange.max}`} color="gray" />
            </div>

            <div className="rounded-xl border border-surface-border bg-surface p-3 text-sm text-muted">
              {result.summary}
            </div>

            {result.strengths.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Strengths</p>
                <ul className="flex flex-col gap-1">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <svg className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.improvements.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Improvements</p>
                <ul className="flex flex-col gap-1">
                  {result.improvements.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <svg className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.sellerTips.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Seller Tips</p>
                <ul className="flex flex-col gap-1">
                  {result.sellerTips.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <svg className="h-4 w-4 shrink-0 mt-0.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  {
    id: "trends",
    label: "Trends",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
  {
    id: "recommendations",
    label: "For You",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    id: "price",
    label: "Pricing",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    id: "listing",
    label: "Analyze",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
];

export function IntelligenceWidget() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("trends");
  const panelRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <>
      {/* Floating trigger button */}
      <div
        ref={panelRef}
        className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px)+1rem)] right-4 z-50 md:bottom-6 md:right-6"
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-full right-0 mb-3 w-[340px] max-h-[80vh] overflow-hidden rounded-2xl border border-surface-border bg-background shadow-2xl shadow-black/15 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-surface-border px-4 py-3 bg-gradient-to-r from-brand-500/5 to-transparent">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-none">AccsMarkets Intelligence</p>
                    <p className="text-[10px] text-muted mt-0.5">Powered by AI</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-surface-border">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium transition-colors",
                      activeTab === tab.id
                        ? "border-b-2 border-brand-500 text-brand-600 dark:text-brand-400"
                        : "text-muted hover:text-foreground border-b-2 border-transparent"
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    {activeTab === "trends" && <TrendsPanel />}
                    {activeTab === "recommendations" && <RecommendationsPanel />}
                    {activeTab === "price" && <PricePanel />}
                    {activeTab === "listing" && <ListingAnalysisPanel />}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="border-t border-surface-border px-4 py-2 text-center">
                <p className="text-[10px] text-muted">Powered by AccsMarkets Intelligence · AI results are advisory only</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB */}
        <motion.button
          onClick={toggle}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          aria-label="AccsMarkets Intelligence"
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full shadow-lg shadow-brand-500/30 transition-colors",
            open
              ? "bg-brand-600 text-white"
              : "bg-brand-500 text-white hover:bg-brand-600"
          )}
        >
          {open ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          )}
        </motion.button>
      </div>
    </>
  );
}
