"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BlogGenerateForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ ok: false, text: data.error ?? "Generation failed." }); return; }
      setMsg({ ok: true, text: "Post generated as DRAFT. Review and publish above." });
      setPrompt("");
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Network error." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        className="min-h-[80px] w-full rounded-xl border border-surface-border bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 sm:text-sm"
        placeholder="e.g. How to safely buy an Instagram account in 2025"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        maxLength={500}
        required
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || prompt.trim().length < 10}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate post"}
        </button>
        <span className="text-xs text-muted">{prompt.length}/500</span>
        {msg && <span className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}
