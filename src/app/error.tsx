"use client";

import { useEffect } from "react";

const CHUNK_ERROR_RE = /Loading chunk \S+ failed|ChunkLoadError|Failed to fetch dynamically imported module/i;
const RELOADED_KEY = "accsmarkets-chunk-reloaded";

function reportError(error: Error & { digest?: string }) {
  try {
    fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        url: window.location.href,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // reporting must never throw
  }
}

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    reportError(error);
    // Stale chunk after a deploy — hard reload picks up the new build. One-shot
    // guard: if the reload lands on the same stale cached page (installed PWA
    // serving from its cache), reloading again would loop forever — show the
    // error UI instead so the user can recover manually.
    if (CHUNK_ERROR_RE.test(error.message)) {
      if (!sessionStorage.getItem(RELOADED_KEY)) {
        sessionStorage.setItem(RELOADED_KEY, "1");
        window.location.reload();
      }
    } else {
      sessionStorage.removeItem(RELOADED_KEY);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
        <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground">Something went wrong</h2>
        <p className="mt-1 text-sm text-muted">An unexpected error occurred. Please try again.</p>
      </div>
      <button
        onClick={() => {
          sessionStorage.removeItem(RELOADED_KEY);
          window.location.reload();
        }}
        className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition"
      >
        Try again
      </button>
    </div>
  );
}
