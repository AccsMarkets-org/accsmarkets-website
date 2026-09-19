import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/ui/AdminPagination";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 50;

const TABS = ["PENDING", "REVIEWING", "RESOLVED", "DISMISSED", "ALL"] as const;
type TabKey = typeof TABS[number];

const REPORT_STATUS_STYLE: Record<string, { label: string; className: string }> = {
  PENDING:   { label: "Pending",   className: "bg-warning/10 text-warning" },
  REVIEWING: { label: "Reviewing", className: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400" },
  RESOLVED:  { label: "Resolved",  className: "bg-success/10 text-success" },
  DISMISSED: { label: "Dismissed", className: "bg-muted/10 text-muted" },
};

const TAB_LABEL: Record<TabKey, string> = {
  PENDING:   "Pending",
  REVIEWING: "Reviewing",
  RESOLVED:  "Resolved",
  DISMISSED: "Dismissed",
  ALL:       "All",
};

const REASON_LABEL: Record<string, string> = {
  SCAM:                  "Scam / fraud",
  FAKE_ACCOUNT:          "Fake account",
  INAPPROPRIATE_CONTENT: "Inappropriate content",
  SPAM:                  "Spam",
  HARASSMENT:            "Harassment",
  OTHER:                 "Other",
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: { tab?: string; page?: string };
}) {
  const tab = (TABS.includes(searchParams.tab as TabKey) ? searchParams.tab as TabKey : "PENDING");
  const page = Math.max(0, Number(searchParams.page ?? 0));

  const statusFilter = tab === "ALL" ? undefined : tab;

  const [rawReports, tabCounts] = await Promise.all([
    prisma.report.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      include: {
        reporter: { select: { id: true, username: true, email: true } },
      },
    }),
    prisma.report.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const hasMore = rawReports.length > PAGE_SIZE;
  const reports = hasMore ? rawReports.slice(0, PAGE_SIZE) : rawReports;

  const countMap: Record<string, number> = {};
  for (const row of tabCounts) countMap[row.status] = row._count._all;
  const pendingCount = (countMap["PENDING"] ?? 0) + (countMap["REVIEWING"] ?? 0);
  const totalCount = Object.values(countMap).reduce((s, c) => s + c, 0);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Reports"
        badge={pendingCount}
        badgeUrgent={pendingCount > 0}
        subtitle="User and listing reports requiring moderation"
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const count = t === "ALL" ? totalCount : (countMap[t] ?? 0);
          const active = t === tab;
          return (
            <Link
              key={t}
              href={`/admin/reports?tab=${t}`}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-brand-500 text-white"
                  : "border border-surface-border bg-surface text-muted hover:text-foreground hover:border-brand-300"
              }`}
            >
              {TAB_LABEL[t]}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  active ? "bg-white/20 text-white" : t === "PENDING" ? "bg-danger text-white" : "bg-surface-border text-muted"
                }`}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        {reports.map((report) => {
          const style = REPORT_STATUS_STYLE[report.status] ?? REPORT_STATUS_STYLE.PENDING;
          const actions = [];
          if (report.status === "PENDING") {
            actions.push({ label: "Start review", action: "start_review", variant: "outline" as const, method: "PATCH" as const });
          }
          if (["PENDING", "REVIEWING"].includes(report.status)) {
            actions.push({ label: "Dismiss", action: "dismiss", variant: "outline" as const, confirm: "Dismiss this report?", method: "PATCH" as const });
            actions.push({ label: "Resolve", action: "resolve", variant: "primary" as const, promptReason: true, method: "PATCH" as const });
            if (report.targetType === "USER") {
              actions.push({ label: "Warn user", action: "warn_user", variant: "outline" as const, promptReason: true, method: "PATCH" as const });
              actions.push({ label: "Ban user", action: "ban_user", variant: "danger" as const, confirm: "Ban this user?", method: "PATCH" as const });
            }
            if (report.targetType === "LISTING") {
              actions.push({ label: "Remove listing", action: "remove_listing", variant: "danger" as const, confirm: "Remove this listing?", method: "PATCH" as const });
            }
          }

          return (
            <Card key={report.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <p className="font-medium">{REASON_LABEL[report.reason] ?? report.reason}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                    <span className="rounded-full bg-surface-border px-2 py-0.5 text-[10px] font-bold uppercase">
                      {report.targetType}
                    </span>
                    {report.targetType === "USER" && (
                      <Link href={`/admin/users/${report.targetId}`} className="font-mono text-xs text-brand-500 hover:underline">
                        {report.targetId.slice(-8)}
                      </Link>
                    )}
                    {report.targetType === "LISTING" && (
                      <Link href={`/admin/listings/${report.targetId}`} className="font-mono text-xs text-brand-500 hover:underline">
                        {report.targetId.slice(-8)}
                      </Link>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Filed by{" "}
                    <Link href={`/admin/users/${report.reporter.id}`} className="text-brand-500 hover:underline">
                      {report.reporter.username ?? report.reporter.email}
                    </Link>
                    {" "}· {formatDate(report.createdAt)}
                  </p>
                  {report.details && <p className="mt-2 text-sm text-foreground">{report.details}</p>}
                </div>
                <StatusPill label={style.label} className={style.className} />
              </div>
              {actions.length > 0 && (
                <AdminActionButtons
                  endpoint={`/api/admin/reports/${report.id}`}
                  actions={actions}
                />
              )}
            </Card>
          );
        })}
        {reports.length === 0 && (
          <p className="py-10 text-center text-muted">No {TAB_LABEL[tab].toLowerCase()} reports.</p>
        )}
      </div>

      <AdminPagination
        page={page}
        hasMore={hasMore}
        baseHref="/admin/reports"
        extraParams={{ tab }}
      />
    </div>
  );
}
