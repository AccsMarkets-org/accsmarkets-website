"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Props {
  missingFields: string[];
}

const DISMISS_KEY = "profile_banner_dismissed_until";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Inline orange/warning banner that shows when the user's profile is incomplete.
 *  Reads localStorage to respect a 24-hour dismiss, so it survives page
 *  navigation but doesn't pester the user again until the next day. */
export function ProfileCompletionBanner({ missingFields }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!missingFields.length) return;
    try {
      const until = localStorage.getItem(DISMISS_KEY);
      if (until && Date.now() < Number(until)) return; // still dismissed
    } catch {
      // localStorage blocked (private mode, etc.) — show anyway
    }
    setVisible(true);
  }, [missingFields]);

  if (!visible || !missingFields.length) return null;

  function handleDismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION_MS));
    } catch {
      // ignore
    }
  }

  /** Maps a missing-field label to the correct settings path. */
  function linkFor(field: string): string {
    if (field === "email verification") return "/dashboard/settings/verification";
    return "/dashboard/settings"; // name + username handled in profile form
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-3 border-b border-warning/30 bg-warning/10 px-4 py-3 text-sm"
    >
      {/* Warning icon */}
      <svg
        className="mt-0.5 h-4 w-4 shrink-0 text-warning"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-warning">Complete your profile</span>
        <span className="text-warning/80"> — missing: </span>
        {missingFields.map((field, i) => (
          <span key={field}>
            <Link
              href={linkFor(field)}
              className="font-medium text-warning underline underline-offset-2 hover:text-warning/80 transition"
            >
              {field}
            </Link>
            {i < missingFields.length - 1 && (
              <span className="text-warning/60">{", "}</span>
            )}
          </span>
        ))}
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss profile completion banner"
        className="shrink-0 rounded p-0.5 text-warning/70 hover:bg-warning/20 hover:text-warning transition"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
