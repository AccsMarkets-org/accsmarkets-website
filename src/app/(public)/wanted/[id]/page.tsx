import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLATFORM_LABEL } from "@/lib/constants";

const BASE_URL = "https://accsmarkets.org";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const item = await prisma.wantedListing.findUnique({
    where: { id: params.id },
    select: { title: true },
  });
  if (!item) return { title: "Wanted Request", robots: { index: false, follow: false } };
  const title = `${item.title} — Wanted · AccsMarkets`;
  const description = "A buyer is looking for this account on AccsMarkets. Submit an offer if you have a matching account for sale.";
  const url = `${BASE_URL}/wanted/${params.id}`;
  return {
    // absolute: `title` already carries the brand; skip the root "%s — AccsMarkets" template.
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: [{ url: "/og-default.png" }] },
    twitter: { card: "summary" as const, title, description },
  };
}

export default async function WantedDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  const item = await prisma.wantedListing.findUnique({
    where: { id: params.id },
    include: {
      buyer: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          verifiedBadge: true,
          trustScore: true,
          countryCode: true,
          createdAt: true,
        },
      },
    },
  });

  if (!item) notFound();

  const isOwner = session?.user?.id === item.buyerId;
  const isAuthenticated = Boolean(session?.user);
  const criteria = (item.criteria ?? {}) as Record<string, unknown>;

  const criteriaRows = Object.entries(criteria).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-4">
        <Link href="/listings?tab=wanted" className="text-sm text-muted hover:text-foreground">
          ← Back to Wanted
        </Link>
      </div>

      <div className="rounded-2xl border border-surface-border bg-surface p-6 shadow-card">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {item.platform && (
            <span className="rounded-full bg-brand-100 dark:bg-brand-900/50 px-3 py-1 text-xs font-semibold text-brand-700">
              {PLATFORM_LABEL[item.platform as keyof typeof PLATFORM_LABEL] ?? item.platform}
            </span>
          )}
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              item.status === "OPEN"
                ? "bg-success/10 text-success"
                : "bg-muted/10 text-muted"
            }`}
          >
            {item.status === "OPEN" ? "Open" : "Closed"}
          </span>
          <span className="ml-auto text-xs text-muted">
            {new Date(item.createdAt).toLocaleDateString()}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-foreground">{item.title}</h1>

        {item.budget && (
          <p className="mt-2 text-3xl font-bold text-brand-600">
            ${Number(item.budget).toLocaleString()}
            <span className="ml-1 text-sm font-normal text-muted">budget</span>
          </p>
        )}

        {criteriaRows.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Requirements</h2>
            <div className="rounded-xl border border-surface-border overflow-hidden">
              {criteriaRows.map(([key, val], i) => (
                <div
                  key={key}
                  className={`flex items-center justify-between px-4 py-3 text-sm ${
                    i < criteriaRows.length - 1 ? "border-b border-surface-border" : ""
                  }`}
                >
                  <span className="text-muted capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                  <span className="font-medium text-foreground">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3 rounded-xl border border-surface-border p-4">
          {item.buyer.image ? (
            <img
              src={item.buyer.image}
              alt={item.buyer.username ?? "buyer"}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-lg font-bold text-brand-700">
              {(item.buyer.username ?? item.buyer.name ?? "?")[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">
              {item.buyer.username ?? item.buyer.name}
              {item.buyer.verifiedBadge !== "NONE" && (
                <span className="ml-1 text-brand-500">✓</span>
              )}
            </p>
            <p className="text-xs text-muted">
              Buyer · Trust score {item.buyer.trustScore}
              {item.buyer.countryCode && ` · ${item.buyer.countryCode}`}
            </p>
          </div>
          <Link
            href={`/profile/${item.buyer.username ?? item.buyer.id}`}
            className="text-xs text-brand-600 hover:underline"
          >
            View profile
          </Link>
        </div>

        <div className="mt-6 flex gap-3">
          {!isOwner && isAuthenticated && item.status === "OPEN" && (
            <Link
              href={`/dashboard/messages/${item.buyerId}`}
              className="flex-1 rounded-xl bg-brand-500 py-3 text-center text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Contact buyer
            </Link>
          )}
          {!isAuthenticated && (
            <Link
              href={`/login?next=/wanted/${item.id}`}
              className="flex-1 rounded-xl bg-brand-500 py-3 text-center text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Sign in to contact buyer
            </Link>
          )}
          {isOwner && (
            <Link
              href="/dashboard/wanted"
              className="flex-1 rounded-xl border border-surface-border py-3 text-center text-sm font-semibold text-foreground hover:bg-brand-50 transition-colors"
            >
              Manage my requests
            </Link>
          )}
          <Link
            href="/listings?tab=wanted"
            className="rounded-xl border border-surface-border px-5 py-3 text-sm text-muted hover:bg-brand-50 transition-colors"
          >
            All wanted
          </Link>
        </div>
      </div>
    </main>
  );
}
