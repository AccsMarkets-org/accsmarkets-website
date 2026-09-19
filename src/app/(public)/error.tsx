"use client";

import { useEffect } from "react";

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-lg font-bold text-foreground">Something went wrong</h2>
      <p className="text-sm text-muted">{error.message || "Please try refreshing the page."}</p>
      <button onClick={reset} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition">
        Refresh
      </button>
    </div>
  );
}
