import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatDate } from "@/lib/utils";

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: { page?: string; action?: string };
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const perPage = 50;
  const actionFilter = searchParams.action?.trim() || undefined;

  const [logs, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where: actionFilter ? { action: { contains: actionFilter } } : undefined,
      include: { admin: { select: { name: true, username: true, email: true, image: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.adminAuditLog.count({
      where: actionFilter ? { action: { contains: actionFilter } } : undefined,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        title="Audit Log"
        badge={total}
        subtitle="Full record of all admin actions on the platform"
      />

      {/* Filter bar */}
      <form method="get" className="flex items-center gap-2">
        <input
          name="action"
          defaultValue={actionFilter ?? ""}
          placeholder="Filter by action…"
          className="h-9 rounded-xl border border-surface-border bg-background px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-56"
        />
        <button
          type="submit"
          className="h-9 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 transition"
        >
          Filter
        </button>
        {actionFilter && (
          <a href="/admin/audit-log" className="h-9 flex items-center rounded-xl border border-surface-border px-3.5 text-sm text-muted hover:text-foreground transition">
            Clear
          </a>
        )}
      </form>

      {/* Log entries */}
      <div className="flex flex-col divide-y divide-surface-border rounded-2xl border border-surface-border bg-surface overflow-hidden">
        {logs.map((log) => {
          const initials = (log.admin.name ?? log.admin.username ?? log.admin.email ?? "A").slice(0, 1).toUpperCase();
          return (
            <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface/60 transition">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-400 text-xs font-bold mt-0.5">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {log.admin.name ?? log.admin.username ?? log.admin.email}
                  </span>
                  <span className="rounded bg-surface-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                    {log.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-muted">{log.targetType} · {log.targetId.slice(0, 8)}…</span>
                </div>
                {log.metadata && Object.keys(log.metadata as object).length > 0 && (
                  <p className="mt-0.5 text-xs text-muted font-mono truncate">
                    {JSON.stringify(log.metadata)}
                  </p>
                )}
              </div>
              <time className="shrink-0 text-xs text-muted whitespace-nowrap">{formatDate(log.createdAt)}</time>
            </div>
          );
        })}
        {logs.length === 0 && (
          <div className="py-16 text-center text-muted text-sm">No audit log entries found.</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            Page {page} of {totalPages} · {total} entries
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`/admin/audit-log?page=${page - 1}${actionFilter ? `&action=${encodeURIComponent(actionFilter)}` : ""}`}
                className="rounded-xl border border-surface-border px-3 py-1.5 hover:bg-surface transition"
              >
                ← Prev
              </a>
            )}
            {page < totalPages && (
              <a
                href={`/admin/audit-log?page=${page + 1}${actionFilter ? `&action=${encodeURIComponent(actionFilter)}` : ""}`}
                className="rounded-xl border border-surface-border px-3 py-1.5 hover:bg-surface transition"
              >
                Next →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
