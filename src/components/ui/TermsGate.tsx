"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";

interface Props {
  userId: string;
}

export function TermsGate({ userId: _userId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/legal/accept-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: CURRENT_TERMS_VERSION }),
      });
      if (!res.ok) throw new Error("Failed to record acceptance");
      setLoading(false);
      // Hard navigation forces the server layout to re-check acceptance
      window.location.reload();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-background p-8 shadow-2xl">
        <h2 className="mb-2 text-xl font-bold text-foreground">Terms of Service updated</h2>
        <p className="mb-6 text-sm text-muted">
          We have updated our Terms of Service (version {CURRENT_TERMS_VERSION}). You must accept
          the updated terms to continue using AccsMarkets.
        </p>
        <div className="mb-6 max-h-48 overflow-y-auto rounded-xl border border-surface-border bg-surface p-4 text-sm text-muted">
          <p className="font-semibold text-foreground">Summary of changes</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Introduced multi-phase dispute resolution with mediation and appeal options</li>
            <li>Added staff role-based access controls for support message management</li>
            <li>Updated referral program to milestone-based $10 rewards per 10 invites</li>
            <li>Clarified escrow cancellation and refund conditions</li>
            <li>Added API usage terms for developer integrations</li>
          </ul>
          <p className="mt-3">
            Full terms available at{" "}
            <a href="/terms" target="_blank" rel="noopener" className="text-brand-600 underline">
              accsmarkets.org/terms
            </a>
          </p>
        </div>
        {error && <p className="mb-4 text-sm text-danger">{error}</p>}
        <button
          onClick={accept}
          disabled={loading}
          className="w-full rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? "Accepting…" : "I accept the updated Terms of Service"}
        </button>
        <p className="mt-3 text-center text-xs text-muted">
          By clicking accept, you confirm you have read and agree to the updated terms.
        </p>
      </div>
    </div>
  );
}

