import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "App Directory — AccsMarkets" };
export const revalidate = 300;

export default async function AppDirectoryPage() {
  const apps = await prisma.appListing
    .findMany({
      where: { status: "APPROVED" },
      orderBy: { installCount: "desc" },
      include: { developer: { select: { username: true } } },
    })
    .catch(() => []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black">App Directory</h1>
          <p className="mt-1 text-muted">Third-party apps built on the AccsMarkets API.</p>
        </div>
        <Link
          href="/dashboard/developer"
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Build an app
        </Link>
      </div>

      {apps.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl">🔌</p>
          <p className="mt-3 text-muted">No apps published yet. Be the first!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <div
              key={app.id}
              className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface p-5 shadow-card"
            >
              <div className="flex items-center gap-3">
                {app.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={app.iconUrl} alt={app.name} className="h-10 w-10 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/50 text-lg font-black text-brand-700">
                    {app.name[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold line-clamp-1">{app.name}</p>
                  <p className="text-xs text-muted">by {app.developer.username}</p>
                </div>
              </div>
              <p className="text-sm text-muted line-clamp-3">{app.description}</p>
              <div className="mt-auto flex items-center justify-between text-xs text-muted">
                <span>{app.installCount} installs</span>
                {app.websiteUrl && (
                  <a href={app.websiteUrl} target="_blank" rel="noopener noreferrer"
                    className="text-brand-600 hover:underline">
                    Website ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
