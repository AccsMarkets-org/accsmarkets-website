import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUSES = ["PENDING", "COMPLETED", "FAILED", "REFUNDED"];

const TABS: { label: string; status: string | null }[] = [
  { label: "All", status: null },
  { label: "Failed", status: "FAILED" },
  { label: "Completed", status: "COMPLETED" },
  { label: "Pending", status: "PENDING" },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PENDING: "bg-muted/10 text-muted",
    COMPLETED: "bg-success/10 text-success",
    FAILED: "bg-danger/10 text-danger",
    REFUNDED: "bg-warning/10 text-warning",
  };
  return map[status] ?? "bg-muted/10 text-muted";
}

export default async function AdminCardDepositsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) redirect("/admin?denied=1");

  const statusFilter = STATUSES.includes(searchParams.status ?? "") ? searchParams.status : undefined;
  const pageRaw = Math.floor(Number(searchParams.page));
  const page = Number.isFinite(pageRaw) && pageRaw > 1 ? pageRaw : 1;

  const where = { provider: "tagadapay", ...(statusFilter ? { status: statusFilter } : {}) };

  const [payments, total] = await Promise.all([
    prisma.fiatPayment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 50,
      take: 50,
      include: { user: { select: { username: true, email: true } } },
    }),
    prisma.fiatPayment.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Card Deposits (TagadaPay)</h1>
      <p className="text-sm text-muted -mt-4">
        If a charge shows FAILED but the customer says their card was charged, use <strong>Re-check with TagadaPay</strong> —
        it asks TagadaPay directly what really happened and only credits the wallet if TagadaPay confirms the charge succeeded.
      </p>

      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((tab) => {
          const href = tab.status ? `?status=${tab.status}` : "?";
          const active = (statusFilter ?? null) === tab.status;
          return (
            <Link
              key={tab.label}
              href={href}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                active ? "bg-brand-500 text-white" : "border border-surface-border text-muted hover:bg-surface"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        {payments.map((p) => (
          <Card key={p.id} className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-medium">
                {formatCurrency(Number(p.amountUsd))}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(p.status)}`}>
                  {p.status}
                </span>
              </p>
              <p className="text-sm text-muted">
                {p.user.username ?? p.user.email} · {formatDate(p.createdAt)}
              </p>
              <p className="font-mono text-xs text-muted mt-0.5">
                {p.providerPaymentId.startsWith("pending_") ? "No TagadaPay payment created" : `Payment: ${p.providerPaymentId}`}
              </p>
            </div>

            {p.status === "FAILED" && !p.providerPaymentId.startsWith("pending_") && (
              <AdminActionButtons
                endpoint={`/api/admin/card-deposits/${p.id}/reconcile`}
                actions={[
                  {
                    label: "Re-check with TagadaPay",
                    action: "reconcile",
                    variant: "primary",
                    confirm: "Ask TagadaPay for this payment's real status and credit the wallet only if it actually succeeded?",
                  },
                ]}
              />
            )}
          </Card>
        ))}
        {payments.length === 0 && (
          <p className="py-10 text-center text-muted">No card deposits{statusFilter ? ` with status ${statusFilter}` : ""}.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted">Page {page} of {totalPages} · {total} deposits</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/admin/card-deposits?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ""}`} className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border px-3 py-1.5 hover:bg-surface transition">
                <ArrowLeft className="h-4 w-4" aria-hidden /> Prev
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/admin/card-deposits?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ""}`} className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border px-3 py-1.5 hover:bg-surface transition">
                Next <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
