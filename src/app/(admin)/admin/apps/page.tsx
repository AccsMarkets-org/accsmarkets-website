import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import { AdminActionButtons } from "@/components/admin/AdminActionButtons";

export const revalidate = 0;

export default async function AdminAppsPage() {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) redirect("/admin?denied=1");

  const [submitted, approved, rejected] = await Promise.all([
    prisma.appListing.findMany({
      where: { status: "SUBMITTED" },
      orderBy: { createdAt: "asc" },
      include: { developer: { select: { id: true, username: true, email: true } }, _count: { select: { installations: true } } },
    }),
    prisma.appListing.findMany({
      where: { status: "APPROVED" },
      orderBy: { installCount: "desc" },
      take: 20,
      include: { developer: { select: { id: true, username: true } }, _count: { select: { installations: true } } },
    }),
    prisma.appListing.findMany({
      where: { status: "REJECTED" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: { developer: { select: { id: true, username: true } } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">App Directory Moderation</h1>

      {/* Pending review */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Pending Review ({submitted.length})</h2>
        {submitted.length === 0 && (
          <p className="rounded-xl border border-surface-border p-6 text-center text-muted">
            No apps awaiting review.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {submitted.map((app) => (
            <Card key={app.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {app.iconUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={app.iconUrl} alt="" className="h-8 w-8 rounded-lg object-cover" width={32} height={32} />
                    )}
                    <p className="font-semibold">{app.name}</p>
                    <span className="rounded-full bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">Pending</span>
                  </div>
                  <p className="mt-1 text-sm text-muted line-clamp-2">{app.description}</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
                    <span>Developer: <strong>{app.developer.username ?? app.developer.email}</strong></span>
                    {app.websiteUrl && <a href={app.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand-600 hover:underline">Website<ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>}
                    <span>Submitted: {formatDate(app.createdAt)}</span>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-medium text-muted">Requested scopes:</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(app.apiScopesRequested as string[]).map((s) => (
                        <span key={s} className="rounded-full bg-surface px-2 py-0.5 font-mono text-[11px] text-foreground border border-surface-border">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <AdminActionButtons
                  endpoint={`/api/admin/apps/${app.id}`}
                  method="PUT"
                  actions={[
                    { label: "Approve", action: "approve", variant: "primary" as const, confirm: `Approve "${app.name}"?` },
                    { label: "Reject", action: "reject", variant: "danger" as const, promptReason: true },
                  ]}
                />
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Approved apps */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Approved ({approved.length})</h2>
        <div className="flex flex-col gap-2">
          {approved.map((app) => (
            <Card key={app.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{app.name}</p>
                <p className="text-xs text-muted">
                  {app.developer.username} · {app.installCount} installs · Approved
                </p>
              </div>
              <AdminActionButtons
                endpoint={`/api/admin/apps/${app.id}`}
                method="PUT"
                actions={[
                  { label: "Revoke", action: "reject", variant: "danger" as const, promptReason: true, confirm: `Revoke approval for "${app.name}"?` },
                ]}
              />
            </Card>
          ))}
        </div>
      </section>

      {/* Recently rejected */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Recently Rejected ({rejected.length})</h2>
        <div className="flex flex-col gap-2">
          {rejected.map((app) => (
            <Card key={app.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{app.name}</p>
                <p className="text-xs text-muted">
                  {app.developer.username} · Rejected {formatDate(app.updatedAt)}
                  {app.rejectionReason && ` · "${app.rejectionReason}"`}
                </p>
              </div>
              <AdminActionButtons
                endpoint={`/api/admin/apps/${app.id}`}
                method="PUT"
                actions={[
                  { label: "Re-approve", action: "approve", variant: "outline" as const, confirm: `Re-approve "${app.name}"?` },
                ]}
              />
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
