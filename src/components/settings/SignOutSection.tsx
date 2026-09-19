"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { notifyNativeLogout } from "@/lib/native-app";

// Dedicated sign-out on the Settings page: on mobile there is no sidebar and
// the header avatar menu is small/easy to miss, so this is the reliable,
// always-reachable way to log out.
export function SignOutSection() {
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Sign Out</h2>
            <p className="text-xs text-muted">End your session on this device</p>
          </div>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            notifyNativeLogout();
            signOut({ callbackUrl: "/" }).catch(() => setLoading(false));
          }}
          className="rounded-xl border border-danger/30 bg-danger/5 px-5 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-50"
        >
          {loading ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </Card>
  );
}
