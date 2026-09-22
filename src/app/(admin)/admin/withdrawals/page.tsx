import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { TransactionStatus } from "@prisma/client";

const TABS: { key: string; label: string; status?: TransactionStatus }[] = [
  { key: "pending",   label: "Pending",   status: "PENDING" },
  { key: "completed", label: "Completed", status: "COMPLETED" },
  { key: "all",       label: "All" },
];

function ageLabel(createdAt: Date): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);
  if (days >= 1) return `${days}d ago`;
  return `${hours}h ago`;
}

export default async function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) redirect("/admin?denied=1");

  const tabKey = TABS.find((t) => t.key === (searchParams.tab ?? "pending"))?.key ?? "pending";
  const tab = TABS.find((t) => t.key === tabKey)!;

  const [withdrawals, statusCounts, pendingAggregate] = await Promise.all([
    prisma.transaction.findMany({
      where: { type: "WITHDRAWAL", ...(tab.status ? { status: tab.status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { user: { select: { id: true, username: true, email: true, walletBalance: true } } },
    }),
    prisma.transaction.groupBy({
      by: ["status"],
      where: { type: "WITHDRAWAL" },
      _count: { _all: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "WITHDRAWAL", status: "PENDING" },
      _sum: { amount: true },
    }),
  ]);

  const statusCount: Record<string, number> = {};
  for (const r of statusCounts) statusCount[r.status] = r._count._all;
  const pendingCount = statusCount["PENDING"] ?? 0;
  const pendingTotal = Number(pendingAggregate._sum.amount ?? 0);

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        title="Withdrawals"
        badge={pendingCount}
        badgeUrgent={pendingCount > 0}
        subtitle={pendingCount > 0 ? `${formatCurrency(pendingTotal.toString())} pending` : "All withdrawal requests"}
      />

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TABS.map((t) => {
          const count = t.status ? (statusCount[t.status] ?? 0) : Object.values(statusCount).reduce((s, c) => s + c, 0);
          const active = t.key === tabKey;
          return (
            <Link
              key={t.key}
              href={`/admin/withdrawals?tab=${t.key}`}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition ${
                active ? "bg-brand-500 text-white" : "border border-surface-border bg-surface text-muted hover:text-foreground hover:border-brand-300"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  active ? "bg-white/20 text-white" : t.key === "pending" ? "bg-warning text-white" : "bg-surface-border text-muted"
                }`}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-2">
        {withdrawals.map((w) => {
          const meta = (w.metadata ?? {}) as {
            method?: string;
            network?: string;
            address?: string;
            bankAccountName?: string;
            bankAccountNumber?: string;
            bankName?: string;
            bankRouting?: string;
            riskHold?: boolean;
            riskLevel?: string;
          };
          const isBank = meta.method === "bank";
          const isPending = w.status === "PENDING";
          return (
            <div
              key={w.id}
              className={`rounded-2xl border p-4 ${isPending ? "border-warning/30 bg-warning/5" : "border-surface-border bg-surface"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xl font-bold ${isPending ? "text-warning" : "text-foreground"}`}>
                      {formatCurrency(w.amount.toString())}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      isPending ? "bg-warning/10 text-warning"
                        : w.status === "COMPLETED" ? "bg-success/10 text-success"
                        : "bg-muted/10 text-muted"
                    }`}>
                      {w.status}
                    </span>
                    {meta.riskHold && (
                      <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger" title="Requester's risk score is elevated — review before approving">
                        Risk hold · {meta.riskLevel ?? "HIGH"}
                      </span>
                    )}
                    {isBank ? (
                      <span className="rounded-full bg-surface-border px-2 py-0.5 text-xs font-medium text-foreground">
                        Bank Wire
                      </span>
                    ) : meta.network && (
                      <span className="rounded-full bg-surface-border px-2 py-0.5 text-xs font-medium text-foreground">
                        {meta.network}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted">
                    <Link href={`/admin/users/${w.user.id}`} className="text-brand-500 hover:underline">
                      {w.user.username ?? w.user.email}
                    </Link>
                    {" · balance "}
                    <span className="font-medium text-foreground">{formatCurrency(w.user.walletBalance.toString())}</span>
                  </p>
                  {isBank ? (
                    <p className="font-mono text-xs text-muted break-all">
                      {meta.bankName} · {meta.bankAccountName} · {meta.bankAccountNumber}
                      {meta.bankRouting ? ` · routing ${meta.bankRouting}` : ""}
                    </p>
                  ) : meta.address && (
                    <p className="font-mono text-xs text-muted break-all">
                      {meta.network}: {meta.address}
                    </p>
                  )}
                  <p className="text-xs text-muted">
                    {formatDate(w.createdAt)} · {ageLabel(w.createdAt)}
                  </p>
                </div>
                {isPending && (
                  <AdminActionButtons
                    endpoint={`/api/admin/withdrawals/${w.id}`}
                    actions={[
                      {
                        label: "Approve & debit",
                        action: "approve",
                        variant: "primary",
                        confirm: isBank
                          ? "Approve this withdrawal? Send the bank wire manually first, then approve."
                          : "Approve this withdrawal? Send the crypto manually first, then approve.",
                      },
                      { label: "Reject", action: "reject", variant: "danger", promptReason: true },
                    ]}
                  />
                )}
              </div>
            </div>
          );
        })}
        {withdrawals.length === 0 && (
          <div className="py-16 text-center text-muted">No withdrawal requests.</div>
        )}
      </div>
    </div>
  );
}
