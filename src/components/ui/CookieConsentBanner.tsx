"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/Toggle";

const STORAGE_KEY = "cookie_consent_v1";

interface ConsentState {
  essential: true;
  analytics: boolean;
  marketing: boolean;
}

function loadConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

function saveConsent(state: ConsentState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  // Best-effort server record for logged-in users
  fetch("/api/legal/cookie-consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categories: state }),
  }).catch(() => undefined);
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!loadConsent()) setVisible(true);
  }, []);

  function acceptAll() {
    const state: ConsentState = { essential: true, analytics: true, marketing: true };
    saveConsent(state);
    setVisible(false);
  }

  function rejectAll() {
    const state: ConsentState = { essential: true, analytics: false, marketing: false };
    saveConsent(state);
    setVisible(false);
  }

  function saveCustom() {
    const state: ConsentState = { essential: true, analytics, marketing };
    saveConsent(state);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-surface-border bg-background shadow-2xl">
      <div className="mx-auto max-w-5xl px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">We use cookies</p>
            <p className="mt-1 text-sm text-muted">
              Essential cookies keep the site working. Optional cookies help us improve your experience.
              {" "}
              <a href="/privacy" className="text-brand-600 underline hover:text-brand-700">
                Privacy policy
              </a>
            </p>

            {expanded && (
              <div className="mt-4 space-y-3 rounded-xl border border-surface-border p-4">
                <ToggleRow
                  label="Essential"
                  description="Authentication, security, session — always on."
                  checked={true}
                  disabled
                  onChange={() => undefined}
                />
                <ToggleRow
                  label="Analytics"
                  description="Anonymous usage data — helps us improve the platform."
                  checked={analytics}
                  onChange={setAnalytics}
                />
                <ToggleRow
                  label="Marketing"
                  description="Personalised content and ads."
                  checked={marketing}
                  onChange={setMarketing}
                />
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="rounded-xl border border-surface-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand-300"
            >
              {expanded ? "Hide options" : "Customize"}
            </button>
            <button
              onClick={rejectAll}
              className="rounded-xl border border-surface-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand-300"
            >
              Reject all
            </button>
            {expanded ? (
              <button
                onClick={saveCustom}
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Save preferences
              </button>
            ) : (
              <button
                onClick={acceptAll}
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Accept all
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}
