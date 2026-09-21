"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";

interface Policy {
  id: string;
  platform: string;
  transferDays: number;
  policyNote: string | null;
  allowTrustless: boolean;
  trustlessBootstrapDays: number;
  sourceNote: string | null;
}

interface Props {
  platform: string;
  existing: Policy | null;
}

export function TransferPolicyEditor({ platform, existing }: Props) {
  const [days, setDays] = useState(String(existing?.transferDays ?? 3));
  const [note, setNote] = useState(existing?.policyNote ?? "");
  const [allowTrustless, setAllowTrustless] = useState(existing?.allowTrustless ?? false);
  const [bootstrapDays, setBootstrapDays] = useState(String(existing?.trustlessBootstrapDays ?? 7));
  const [sourceNote, setSourceNote] = useState(existing?.sourceNote ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/transfer-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          transferDays: Number(days),
          policyNote: note || null,
          allowTrustless,
          trustlessBootstrapDays: Number(bootstrapDays),
          sourceNote: sourceNote || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setSaved(true);
      toast.success("Policy saved");
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-3">
      <Input
        label="Transfer days"
        type="number"
        min={1}
        max={90}
        value={days}
        onChange={(e) => setDays(e.target.value)}
      />
      <Textarea
        label="Policy note (shown to buyers)"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. YouTube transfers require Google account email from the buyer..."
      />
      <div className="flex items-center gap-2">
        <input
          id={`trustless-${platform}`}
          type="checkbox"
          checked={allowTrustless}
          onChange={(e) => setAllowTrustless(e.target.checked)}
          className="h-4 w-4 rounded border-surface-border"
        />
        <label htmlFor={`trustless-${platform}`} className="text-sm font-medium">
          Allow Trustless transfer model
        </label>
      </div>
      {allowTrustless && (
        <Input
          label="Trustless bootstrap days"
          type="number"
          min={1}
          max={90}
          value={bootstrapDays}
          onChange={(e) => setBootstrapDays(e.target.value)}
        />
      )}
      <Textarea
        label="Source / evidence (internal)"
        rows={2}
        value={sourceNote}
        onChange={(e) => setSourceNote(e.target.value)}
        placeholder="e.g. https://support.google.com/youtube/... — YouTube 7-day manager tenure rule"
      />
      <Button type="submit" isLoading={saving} size="sm">
        {saved ? <><Check className="h-4 w-4" aria-hidden />Saved</> : "Save policy"}
      </Button>
    </form>
  );
}
