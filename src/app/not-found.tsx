import Link from "next/link";

export const metadata = {
  title: "Page not found — AccsMarkets",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-900/50">
        <svg className="h-7 w-7 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-brand-500">404</p>
        <h1 className="mt-1 text-lg font-bold text-foreground">Page not found</h1>
        <p className="mt-1 text-sm text-muted">The page you're looking for doesn't exist or may have moved.</p>
      </div>
      <div className="mt-2 flex gap-3">
        <Link
          href="/"
          className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition"
        >
          Go home
        </Link>
        <Link
          href="/listings"
          className="rounded-xl border border-surface-border px-5 py-2.5 text-sm font-semibold text-foreground hover:border-brand-300 transition"
        >
          Browse listings
        </Link>
      </div>
    </div>
  );
}
