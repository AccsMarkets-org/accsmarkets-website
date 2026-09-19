"use client";

import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface ReferralData {
  referralLink: string;
  code: string;
  invited: number;
  rewarded: number;
  milestoneProgress: number;
  milestonesCompleted: number;
  totalEarned: number;
}

export function ReferralDashboard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/referrals")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function copyLink() {
    if (!data) return;
    navigator.clipboard.writeText(data.referralLink).then(() => toast.success("Link copied!"));
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (!data) return <p className="text-sm text-danger">Could not load referral info.</p>;

  const progressPercent = (data.milestoneProgress / 10) * 100;
  const invitesNeeded = 10 - data.milestoneProgress;

  return (
    <div className="flex flex-col gap-6">
      {/* Referral link */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Your referral link</label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            readOnly
            value={data.referralLink}
            className="flex-1 rounded-xl border border-surface-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            onFocus={() => inputRef.current?.select()}
          />
          <button
            onClick={copyLink}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 active:bg-brand-800 transition-colors"
          >
            Copy
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Share code: <span className="font-mono font-semibold text-foreground">{data.code}</span>
        </p>
      </div>

      {/* Milestone progress */}
      <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-background p-5 dark:border-brand-800 dark:from-brand-950/30">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Milestone Progress</p>
            <p className="text-xs text-muted mt-0.5">
              {data.milestoneProgress}/10 invites — <span className="text-brand-600 font-medium">$10 reward at 10!</span>
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
        </div>
        <div className="h-3 w-full rounded-full bg-surface-border overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          {invitesNeeded > 0
            ? `${invitesNeeded} more invite${invitesNeeded !== 1 ? "s" : ""} to unlock your next $10 reward`
            : "Processing your reward..."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Total invited" value={data.invited} />
        <StatCard label="Milestones hit" value={data.milestonesCompleted} />
        <StatCard label="Total earned" value={`$${data.totalEarned}`} highlight />
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-surface-border bg-surface/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-semibold text-foreground">How it works</p>
        </div>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted">
          <li>Share your unique referral link with friends.</li>
          <li>They sign up using your link — each counts as an invite.</li>
          <li>For every <span className="font-semibold text-foreground">10 invites</span>, you earn a <span className="font-semibold text-brand-600">$10 wallet credit</span>.</li>
          <li>No limit — keep inviting and keep earning at every milestone!</li>
        </ol>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className={cn(
      "rounded-xl border p-4 text-center",
      highlight ? "border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/30" : "border-surface-border bg-surface",
    )}>
      <p className={cn("text-2xl font-bold", highlight ? "text-brand-600 dark:text-brand-400" : "text-foreground")}>{value}</p>
      <p className="mt-1 text-[11px] text-muted">{label}</p>
    </div>
  );
}
