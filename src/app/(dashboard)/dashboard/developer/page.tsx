import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { DeveloperDashboard } from "@/components/developer/DeveloperDashboard";
import { DeveloperPortalSections } from "./DeveloperPortalClient";
import { AlignLeft, Clock, CodeXml, Globe, KeyRound, Link as LinkIcon, ShieldCheck } from "lucide-react";

export const metadata = { title: "Developer" };

export default async function DeveloperPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const [apiKeys, webhooks, keyCount] = await Promise.all([
    prisma.apiKey.findMany({
      where: { userId: session.user.id, revokedAt: null },
      select: { id: true, name: true, keyPrefix: true, scopes: true, lastUsedAt: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.webhookEndpoint.findMany({
      where: { userId: session.user.id },
      select: {
        id: true, url: true, events: true, enabled: true, createdAt: true,
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.apiKey.count({ where: { userId: session.user.id, revokedAt: null } }),
  ]);

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://accsmarkets.org";

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-6">
      <DeveloperPortalSections>
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Developer Portal</h1>
          <p className="mt-1 text-sm text-muted">
            Build integrations with the AccsMarkets API. Manage API keys, webhooks, and explore available endpoints.
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/50 text-brand-600">
              <KeyRound className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{keyCount}</p>
              <p className="text-xs text-muted">Active API keys</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300">
              <LinkIcon className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{webhooks.length}</p>
              <p className="text-xs text-muted">Webhook endpoints</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">60/min</p>
              <p className="text-xs text-muted">Rate limit</p>
            </div>
          </Card>
        </div>

        {/* Base URL + Auth */}
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-border text-muted">
              <Globe className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Base URL</h2>
              <p className="text-xs text-muted">All API requests use this base URL</p>
            </div>
          </div>
          <code className="block rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-sm font-mono text-foreground">
            {baseUrl}/api/v1
          </code>
          <p className="mt-3 text-xs text-muted">
            Authenticate with: <code className="rounded bg-surface-border px-1.5 py-0.5 font-mono text-foreground">Authorization: Bearer &lt;api_key&gt;</code>
          </p>
        </Card>

        {/* Quick start code snippets */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <CodeXml className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Quick Start</h2>
              <p className="text-xs text-muted">Copy-paste examples to get started</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <CodeSnippet
              label="cURL"
              code={`curl -H "Authorization: Bearer YOUR_API_KEY" \\\n  ${baseUrl}/api/v1/listings`}
            />
            <CodeSnippet
              label="JavaScript"
              code={`const res = await fetch("${baseUrl}/api/v1/listings", {\n  headers: { Authorization: "Bearer YOUR_API_KEY" }\n});\nconst data = await res.json();`}
            />
            <CodeSnippet
              label="Python"
              code={`import requests\n\nres = requests.get(\n    "${baseUrl}/api/v1/listings",\n    headers={"Authorization": "Bearer YOUR_API_KEY"}\n)\ndata = res.json()`}
            />
          </div>
        </Card>

        {/* Available endpoints */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
              <AlignLeft className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Available Endpoints</h2>
              <p className="text-xs text-muted">Public v1 API endpoints you can access</p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted">Method</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted">Endpoint</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                <EndpointRow method="GET" path="/v1/listings" desc="List all active listings with filters" />
                <EndpointRow method="GET" path="/v1/listings/:id" desc="Get a single listing by ID" />
                <EndpointRow method="GET" path="/v1/me" desc="Get current user profile" />
                <EndpointRow method="GET" path="/v1/me/escrows" desc="List your escrow transactions" />
                <EndpointRow method="GET" path="/v1/me/wallet" desc="Get wallet balance & transactions" />
                <EndpointRow method="POST" path="/v1/offers" desc="Create a new offer on a listing" />
                <EndpointRow method="GET" path="/v1/me/notifications" desc="List recent notifications" />
              </tbody>
            </table>
          </div>
        </Card>

        {/* Rate limits */}
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <Clock className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Rate Limits</h2>
              <p className="text-xs text-muted">Request limits per API key</p>
            </div>
          </div>
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
            Rate limit headers: <code className="rounded bg-surface-border px-1 py-0.5 font-mono text-[11px]">X-RateLimit-Remaining</code>, <code className="rounded bg-surface-border px-1 py-0.5 font-mono text-[11px]">X-RateLimit-Reset</code>
          </p>
        </Card>

        {/* API Keys & Webhooks */}
        <DeveloperDashboard initialKeys={apiKeys as any[]} initialWebhooks={webhooks as any[]} />
      </DeveloperPortalSections>
    </div>
  );
}

function CodeSnippet({ label, code }: { label: string; code: string }) {
  return (
    <div className="rounded-lg border border-surface-border overflow-hidden">
      <div className="flex items-center justify-between border-b border-surface-border bg-surface px-3 py-1.5">
        <span className="text-[11px] font-medium text-muted">{label}</span>
      </div>
      <pre className="overflow-x-auto bg-background px-3 py-2.5 text-xs text-foreground/90 font-mono leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

function EndpointRow({ method, path, desc }: { method: string; path: string; desc: string }) {
  const methodColor = method === "GET" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
  return (
    <tr>
      <td className="px-4 py-2.5">
        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${methodColor}`}>
          {method}
        </span>
      </td>
      <td className="px-4 py-2.5 font-mono text-xs text-foreground">{path}</td>
      <td className="px-4 py-2.5 text-xs text-muted">{desc}</td>
    </tr>
  );
}
