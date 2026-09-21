"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
        <TriangleAlert className="h-6 w-6 text-red-500" strokeWidth={1.8} aria-hidden />
      </div>
      <div>
        <h2 className="text-base font-bold text-foreground">Something went wrong</h2>
        <p className="mt-1 text-sm text-muted">{error.message || "An unexpected error occurred on this page."}</p>
      </div>
      <button onClick={reset} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition">
        Try again
      </button>
    </div>
  );
}
