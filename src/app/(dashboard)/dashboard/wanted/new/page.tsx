"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const PLATFORMS = [
  "YOUTUBE", "INSTAGRAM", "TIKTOK", "FACEBOOK",
  "TELEGRAM", "TWITTER_X", "SNAPCHAT", "PINTEREST", "LINKEDIN", "WEBSITE",
] as const;

const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE: "YouTube", INSTAGRAM: "Instagram", TIKTOK: "TikTok",
  FACEBOOK: "Facebook", TELEGRAM: "Telegram", TWITTER_X: "X / Twitter",
  SNAPCHAT: "Snapchat", PINTEREST: "Pinterest", LINKEDIN: "LinkedIn",
  WEBSITE: "Website",
};

export default function NewWantedListingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("");
  const [minFollowers, setMinFollowers] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }

    const criteria: Record<string, unknown> = {};
    if (minFollowers) criteria.minFollowers = Number(minFollowers);
    if (notes.trim()) criteria.notes = notes.trim();

    setLoading(true);
    try {
      const res = await fetch("/api/wanted-listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          platform: platform || undefined,
          criteria,
          budget: maxBudget ? Number(maxBudget) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      toast.success("Wanted listing posted!");
      router.push("/listings?tab=wanted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Post a Wanted Request</h1>
        <p className="mt-1 text-sm text-muted">
          Describe what account you&apos;re looking for. Sellers will contact you if they have a match.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Title *"
            placeholder="e.g. Looking for a YouTube channel 100k+ gaming niche"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Platform (optional)</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Any platform</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
              ))}
            </select>
          </div>

          <Input
            label="Minimum followers / subscribers"
            type="number"
            min={0}
            placeholder="e.g. 100000"
            value={minFollowers}
            onChange={(e) => setMinFollowers(e.target.value)}
          />

          <Input
            label="Maximum budget (USD)"
            type="number"
            min={1}
            step="0.01"
            placeholder="e.g. 5000"
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Additional requirements (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Niche, monetization status, country, engagement rate, etc."
              className="rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <p className="text-xs text-muted text-right">{notes.length}/500</p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              Post wanted request
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
