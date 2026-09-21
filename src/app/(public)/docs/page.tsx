import Link from "next/link";

const BASE_URL = "https://accsmarkets.org";

export const metadata = {
  title: "API Docs",
  description: "REST API reference for AccsMarkets — read listings and profile data programmatically.",
  alternates: { canonical: `${BASE_URL}/docs` },
  openGraph: {
    title: "API Docs — AccsMarkets",
    description: "REST API reference for AccsMarkets — read listings and profile data programmatically.",
    url: `${BASE_URL}/docs`,
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const, title: "API Docs — AccsMarkets" },
};

// Keep this in sync with what actually exists under src/app/api/v1/** — this
// page previously documented 7 endpoints when only 2 were real, which is
// worse than no docs at all for anyone actually trying to integrate.
const ENDPOINTS = [
  { method: "GET", path: "/v1/listings", desc: "List active listings, with filters" },
  { method: "GET", path: "/v1/me", desc: "Get the authenticated user's profile" },
];

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-surface-border">
      <div className="flex items-center justify-between border-b border-surface-border bg-surface px-3 py-1.5">
        <span className="text-[11px] font-medium text-muted">{label}</span>
      </div>
      <pre className="overflow-x-auto bg-background px-4 py-3 text-xs leading-relaxed text-foreground/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tight text-foreground">API Documentation</h1>
        <p className="mt-2 text-sm text-muted">
          Build integrations with the AccsMarkets API — read live listings and your account profile programmatically. More endpoints are on the roadmap.
        </p>
        <Link
          href="/dashboard/developer"
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          Get your API key
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Link>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-foreground">Base URL</h2>
        <code className="block rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-sm font-mono text-foreground">
          {BASE_URL}/api/v1
        </code>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-foreground">Authentication</h2>
        <p className="mb-3 text-sm text-muted">
          Every request must include your API key as a bearer token. Create and manage keys from the{" "}
          <Link href="/dashboard/developer" className="text-brand-500 hover:underline">Developer Portal</Link> once logged in.
        </p>
        <code className="block rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-sm font-mono text-foreground">
          Authorization: Bearer &lt;api_key&gt;
        </code>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-foreground">Quick Start</h2>
        <div className="flex flex-col gap-3">
          <CodeBlock label="cURL" code={`curl -H "Authorization: Bearer YOUR_API_KEY" \\\n  ${BASE_URL}/api/v1/listings`} />
          <CodeBlock
            label="JavaScript"
            code={`const res = await fetch("${BASE_URL}/api/v1/listings", {\n  headers: { Authorization: "Bearer YOUR_API_KEY" }\n});\nconst data = await res.json();`}
          />
          <CodeBlock
            label="Python"
            code={`import requests\n\nres = requests.get(\n    "${BASE_URL}/api/v1/listings",\n    headers={"Authorization": "Bearer YOUR_API_KEY"}\n)\ndata = res.json()`}
          />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-foreground">Endpoints</h2>
        <div className="overflow-x-auto rounded-xl border border-surface-border">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted">Method</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted">Endpoint</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {ENDPOINTS.map((e) => (
                <tr key={e.path}>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      e.method === "GET" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                    }`}>
                      {e.method}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-foreground">{e.path}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-foreground">Rate Limits</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-surface-border bg-surface px-4 py-3">
            <p className="text-xs font-medium text-muted">Standard tier</p>
            <p className="mt-1 text-lg font-bold text-foreground">60 req/min</p>
            <p className="text-xs text-muted">Per API key</p>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface px-4 py-3">
            <p className="text-xs font-medium text-muted">Enterprise tier</p>
            <p className="mt-1 text-lg font-bold text-foreground">300 req/min</p>
            <p className="text-xs text-muted">Contact sales to upgrade</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Rate limit headers: <code className="rounded bg-surface-border px-1 py-0.5 font-mono text-[11px]">X-RateLimit-Remaining</code>,{" "}
          <code className="rounded bg-surface-border px-1 py-0.5 font-mono text-[11px]">X-RateLimit-Reset</code>
        </p>
      </section>
    </main>
  );
}
