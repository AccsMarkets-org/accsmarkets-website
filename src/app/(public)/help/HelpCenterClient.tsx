"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HELP_ARTICLES, HELP_CATEGORIES, searchHelpArticles, type HelpArticle } from "@/lib/help-articles";

const CATEGORY_ICON: Record<string, string> = {
  "Getting Started": "🚀",
  "Buying": "🛒",
  "Selling": "🏷️",
  "Escrow & Transfers": "🔒",
  "Payments & Fees": "💳",
  "Trust & Disputes": "⚖️",
  "Account & Security": "🛡️",
};

export function HelpCenterClient() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const results = useMemo(() => {
    const base = query.trim() ? searchHelpArticles(query) : HELP_ARTICLES;
    return activeCategory ? base.filter((a) => a.category === activeCategory) : base;
  }, [query, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<string, HelpArticle[]>();
    for (const a of results) {
      if (!map.has(a.category)) map.set(a.category, []);
      map.get(a.category)!.push(a);
    }
    return map;
  }, [results]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black tracking-tight text-foreground">Help Center</h1>
        <p className="mt-2 text-sm text-muted">Search answers on buying, selling, escrow, payments, and account security.</p>

        <div className="relative mx-auto mt-6 max-w-xl">
          <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveCategory(null); }}
            placeholder="Search help articles…"
            className="h-12 w-full rounded-2xl border border-surface-border bg-surface pl-11 pr-4 text-sm focus:border-brand-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            activeCategory === null
              ? "bg-brand-500 text-white"
              : "border border-surface-border text-muted hover:border-brand-300 hover:text-foreground"
          }`}
        >
          All topics
        </button>
        {HELP_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => { setActiveCategory(c); setQuery(""); }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              activeCategory === c
                ? "bg-brand-500 text-white"
                : "border border-surface-border text-muted hover:border-brand-300 hover:text-foreground"
            }`}
          >
            <span>{CATEGORY_ICON[c]}</span>
            {c}
          </button>
        ))}
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="rounded-2xl border border-surface-border bg-surface px-6 py-16 text-center">
          <p className="text-sm font-semibold text-foreground">No articles match "{query}"</p>
          <p className="mt-1 text-sm text-muted">
            Try a different search, or{" "}
            <Link href="/contact" className="text-brand-500 hover:underline">contact support</Link> directly.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {[...grouped.entries()].map(([category, articles]) => (
            <section key={category}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
                <span>{CATEGORY_ICON[category]}</span>
                {category}
              </h2>
              <div className="flex flex-col gap-2.5">
                {articles.map((a) => {
                  const isOpen = openSlug === a.slug;
                  return (
                    <div
                      key={a.slug}
                      className="overflow-hidden rounded-2xl border border-surface-border bg-background transition hover:border-brand-200"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenSlug(isOpen ? null : a.slug)}
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                      >
                        <span className="text-sm font-semibold text-foreground">{a.question}</span>
                        <svg
                          className={`h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {isOpen && (
                        <p className="px-5 pb-4 text-sm leading-relaxed text-muted">{a.answer}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="mt-14 rounded-2xl border border-surface-border bg-surface px-6 py-8 text-center">
        <p className="text-sm font-semibold text-foreground">Still need help?</p>
        <p className="mt-1 text-sm text-muted">Our support team responds directly in messages once you're logged in, or reach out below.</p>
        <Link
          href="/contact"
          className="mt-4 inline-block rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          Contact support
        </Link>
      </div>
    </main>
  );
}
