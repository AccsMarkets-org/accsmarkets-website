"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";

type TargetType = "LISTING" | "USER" | "MESSAGE";

const REASONS = [
  { value: "SCAM", label: "Scam / fraud" },
  { value: "FAKE_ACCOUNT", label: "Fake account" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "OTHER", label: "Other" },
] as const;

interface ReportModalProps {
  targetType: TargetType;
  targetId: string;
  onClose: () => void;
}

export function ReportModal({ targetType, targetId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!reason) return;
    setLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, details: details || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success("Report submitted — our team will review it.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 z-50 max-w-md -translate-y-1/2 rounded-2xl bg-background p-6 shadow-xl sm:inset-x-auto sm:left-1/2 sm:w-full sm:-translate-x-1/2">
        <h2 className="mb-4 text-lg font-bold">Report content</h2>

        <div className="mb-4 flex flex-col gap-1">
          <label className="text-sm font-medium">Reason</label>
          <select
            className="h-10 rounded-xl border border-surface-border bg-background px-3 text-base focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="">Select a reason…</option>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <Textarea
          label="Additional details (optional)"
          rows={3}
          maxLength={2000}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Describe what happened…"
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!reason} isLoading={loading} onClick={submit}>
            Submit report
          </Button>
        </div>
      </div>
    </>
  );
}
