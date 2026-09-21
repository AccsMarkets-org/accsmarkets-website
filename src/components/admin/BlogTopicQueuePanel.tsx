"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Sparkles } from "lucide-react";

interface QueueItem {
  id: string;
  prompt: string;
  status: string;
  createdAt: string;
}

interface SuggestedTopic {
  title: string;
  category: string;
  seoScore: number;
}

export function BlogTopicQueuePanel() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Suggestion state
  const [suggestions, setSuggestions] = useState<SuggestedTopic[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [seedKeyword, setSeedKeyword] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);

  async function fetchQueue() {
    const res = await fetch("/api/admin/blog/queue");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
    }
  }

  useEffect(() => { fetchQueue(); }, []);

  async function addTopic(prompt?: string) {
    const topic = prompt ?? input;
    if (!topic.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/blog/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: topic }),
    });
    if (res.ok) {
      toast.success("Topic added to queue");
      if (!prompt) setInput("");
      fetchQueue();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Failed");
    }
    setSaving(false);
  }

  async function removeItem(id: string) {
    const res = await fetch(`/api/admin/blog/queue?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Removed"); fetchQueue(); }
    else toast.error("Failed to remove");
  }

  async function suggestTopics() {
    setSuggesting(true);
    setShowSuggestions(true);
    setSuggestions([]);
    try {
      const url = seedKeyword.trim()
        ? `/api/admin/blog/suggest-topics?seed=${encodeURIComponent(seedKeyword.trim())}`
        : "/api/admin/blog/suggest-topics";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSuggestions(data.topics ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI suggestion failed");
      setShowSuggestions(false);
    } finally {
      setSuggesting(false);
    }
  }

  async function addSuggestion(topic: SuggestedTopic, idx: number) {
    setAddingId(idx);
    await addTopic(topic.title);
    setSuggestions((prev) => prev.filter((_, i) => i !== idx));
    setAddingId(null);
  }

  const CATEGORY_COLORS: Record<string, string> = {
    buying:  "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
    selling: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
    safety:  "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
    guide:   "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
    trend:   "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
  };

  return (
    <div className="space-y-4">
      {/* Manual add row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTopic()}
          placeholder="e.g. How to sell a Discord server safely"
          className="flex-1 rounded-xl border border-surface-border bg-surface px-3 py-2 text-base focus:border-brand-500 focus:outline-none sm:text-sm"
        />
        <button
          onClick={() => addTopic()}
          disabled={saving || !input.trim()}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {/* AI Suggest section */}
      <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3">
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          AI Topic Suggestions
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={seedKeyword}
            onChange={(e) => setSeedKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && suggestTopics()}
            placeholder="Optional keyword focus (e.g. Instagram, TikTok)"
            className="flex-1 rounded-xl border border-brand-200 dark:border-brand-800 bg-white dark:bg-background px-3 py-2 text-base focus:border-brand-500 focus:outline-none sm:text-sm"
          />
          <button
            onClick={suggestTopics}
            disabled={suggesting}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {suggesting ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V13a1 1 0 11-2 0V6.414L7.707 7.707A1 1 0 016.293 6.293l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Suggest 10 Topics
              </>
            )}
          </button>
        </div>

        {/* Suggestions list */}
        {showSuggestions && (
          <div className="mt-3 space-y-1.5">
            {suggesting && suggestions.length === 0 && (
              <p className="text-xs text-brand-600 italic">Groq AI is generating topic ideas…</p>
            )}
            {suggestions.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-lg border border-brand-100 dark:border-brand-800 bg-white dark:bg-background px-3 py-2 text-sm"
              >
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize ${CATEGORY_COLORS[s.category] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400"}`}>
                  {s.category}
                </span>
                <span className="flex-1 text-foreground">{s.title}</span>
                <span className="shrink-0 text-[10px] text-muted" title="SEO score">
                  SEO {s.seoScore}/10
                </span>
                <button
                  onClick={() => addSuggestion(s, idx)}
                  disabled={addingId === idx || saving}
                  className="shrink-0 rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {addingId === idx ? "Adding…" : "+ Queue"}
                </button>
              </div>
            ))}
            {!suggesting && suggestions.length === 0 && (
              <p className="text-xs text-muted italic">No suggestions yet. Click &quot;Suggest 10 Topics&quot; above.</p>
            )}
            {suggestions.length > 0 && (
              <button
                onClick={suggestTopics}
                disabled={suggesting}
                className="mt-1 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${suggesting ? "animate-spin" : ""}`} aria-hidden />
                Regenerate suggestions
              </button>
            )}
          </div>
        )}
      </div>

      {/* Queue list */}
      {items.length === 0 ? (
        <p className="text-sm text-muted italic">Queue is empty. Add topics above for the next cron run.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={item.id} className="flex items-center gap-2 rounded-lg border border-surface-border bg-background px-3 py-2 text-sm">
              <span className="shrink-0 text-xs text-muted font-mono">#{i + 1}</span>
              <span className="flex-1 text-foreground">{item.prompt}</span>
              <button
                onClick={() => removeItem(item.id)}
                className="shrink-0 text-xs text-muted hover:text-danger"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">
        The cron job runs twice daily (9am &amp; 3pm) and picks the next pending topic.
        If empty, a topic is auto-suggested by AI.
      </p>
    </div>
  );
}
