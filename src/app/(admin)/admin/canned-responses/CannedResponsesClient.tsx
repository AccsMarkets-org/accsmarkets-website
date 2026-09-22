"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface CannedResponse {
  id: string;
  title: string;
  body: string;
}

// Rendered by ./page.tsx (a server component) after requireAdmin("MANAGE_USERS").
export function CannedResponsesClient() {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/canned-responses");
    const data = await res.json();
    setResponses(data.responses ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/canned-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, body: newBody }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewTitle(""); setNewBody("");
      toast.success("Created");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(r: CannedResponse) {
    setEditingId(r.id);
    setEditTitle(r.title);
    setEditBody(r.body);
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/canned-responses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, body: editBody }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEditingId(null);
      toast.success("Saved");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this canned response?")) return;
    try {
      const res = await fetch(`/api/admin/canned-responses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Deleted");
      setResponses((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold mb-1">Canned Responses</h1>
      <p className="text-sm text-muted mb-6">Reusable replies for the official support thread.</p>

      {/* Create form */}
      <Card className="mb-6">
        <h2 className="font-semibold mb-3">New canned response</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title (e.g. Escrow funding instructions)"
            className="h-9 rounded-xl border border-surface-border bg-background px-3 text-base focus:border-brand-400 focus:outline-none sm:text-sm"
          />
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Message body…"
            rows={4}
            className="rounded-xl border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-400 focus:outline-none resize-y sm:text-sm"
          />
          <div className="flex justify-end">
            <Button type="submit" isLoading={saving} disabled={!newTitle.trim() || !newBody.trim()}>
              Add response
            </Button>
          </div>
        </form>
      </Card>

      {loading && <p className="text-sm text-muted">Loading…</p>}

      {!loading && responses.length === 0 && (
        <p className="text-sm text-muted">No canned responses yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {responses.map((r) =>
          editingId === r.id ? (
            <Card key={r.id}>
              <div className="flex flex-col gap-3">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-9 rounded-xl border border-surface-border bg-background px-3 text-base focus:border-brand-400 focus:outline-none sm:text-sm"
                />
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={4}
                  className="rounded-xl border border-surface-border bg-background px-3 py-2 text-base focus:border-brand-400 focus:outline-none resize-y sm:text-sm"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-surface-border px-3 py-1.5 text-sm text-muted hover:text-foreground transition"
                  >
                    Cancel
                  </button>
                  <Button isLoading={saving} onClick={() => handleSaveEdit(r.id)}>Save</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{r.title}</p>
                  <p className="mt-1 text-sm text-muted whitespace-pre-wrap line-clamp-3">{r.body}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(r)}
                    className="rounded-lg border border-surface-border px-2.5 py-1 text-xs text-muted hover:text-foreground transition"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    className="rounded-lg border border-danger/30 bg-danger/5 px-2.5 py-1 text-xs text-danger hover:bg-danger/10 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
