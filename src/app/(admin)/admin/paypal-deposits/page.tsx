import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BankTransferStatus } from "@prisma/client";

const PAYPAL_STATUSES: BankTransferStatus[] = ["PENDING", "SENT", "VERIFIED", "REJECTED", "EXPIRED"];

const TABS: { label: string; status: BankTransferStatus | null }[] = [
  { label: "All", status: null },
  { label: "Needs Review", status: "SENT" },
  { label: "Verified", status: "VERIFIED" },
  { label: "Rejected", status: "REJECTED" },
];

function statusBadge(status: BankTransferStatus) {
  const map: Record<BankTransferStatus, string> = {
    PENDING: "bg-muted/10 text-muted",
    SENT: "bg-warning/10 text-warning",
    VERIFIED: "bg-success/10 text-success",
    REJECTED: "bg-danger/10 text-danger",
    EXPIRED: "bg-muted/10 text-muted",
  };
  return map[status] ?? "bg-muted/10 text-muted";
}

export default async function AdminPayPalDepositsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) redirect("/admin?denied=1");

  const statusFilter = PAYPAL_STATUSES.includes(searchParams.status as BankTransferStatus)
    ? (searchParams.status as BankTransferStatus)
    : undefined;
  const pageRaw = Math.floor(Number(searchParams.page));
  const page = Number.isFinite(pageRaw) && pageRaw > 1 ? pageRaw : 1;

  const where = statusFilter ? { status: statusFilter } : {};

  const [orders, total] = await Promise.all([
    prisma.payPalDepositOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 50,
      take: 50,
      include: {
        user: { select: { username: true, email: true } },
        paypalAccount: { select: { label: true, currency: true } },
      },
    }),
    prisma.payPalDepositOrder.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">PayPal Deposits</h1>

      {/* Tab bar */}
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
        {orders.map((order) => (
          <Card key={order.id} className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-medium">
                {formatCurrency(Number(order.totalDue))} {order.paypalAccount.currency}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(order.status)}`}>
                  {order.status}
                </span>
              </p>
              <p className="text-sm text-muted">
                {order.user.username ?? order.user.email} · {formatDate(order.createdAt)}
              </p>
              <p className="font-mono text-xs text-muted mt-0.5">
                Ref: {order.referenceId} · Account: {order.paypalAccount.label}
              </p>
              <p className="text-xs text-muted mt-0.5">
                Deposit: {formatCurrency(Number(order.amountUsd))} + fee: {formatCurrency(Number(order.feeUsd))}
              </p>
              {order.sentAt && (
                <p className="text-xs text-muted">Sent at: {formatDate(order.sentAt)}</p>
              )}
              {order.senderPaypalEmail && (
                <p className="text-xs text-muted">Sender PayPal: {order.senderPaypalEmail}</p>
              )}
              {order.transactionId && (
                <p className="font-mono text-xs text-muted">PayPal Txn ID: {order.transactionId}</p>
              )}
              {order.proofImageUrl && (
                <a href={order.proofImageUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">
                  View proof
                </a>
              )}
            </div>

            {order.status === "SENT" && (
              <AdminActionButtons
                endpoint={`/api/admin/paypal-deposits/${order.id}`}
                actions={[
                  {
                    label: "Verify & credit",
                    action: "verify",
                    variant: "primary",
                    promptAmount: true,
                    confirm: `Credit ${formatCurrency(Number(order.amountUsd))} to this user's wallet?`,
                  },
                  {
                    label: "Partial",
                    action: "partial",
                    variant: "secondary",
                    promptAmount: true,
                  },
                  { label: "Reject", action: "reject", variant: "danger", promptReason: true },
                ]}
              />
            )}
            {order.status === "PENDING" && (
              <AdminActionButtons
                endpoint={`/api/admin/paypal-deposits/${order.id}`}
                actions={[{ label: "Reject", action: "reject", variant: "danger", promptReason: true }]}
              />
            )}
          </Card>
        ))}
        {orders.length === 0 && (
          <p className="py-10 text-center text-muted">No PayPal deposits{statusFilter ? ` with status ${statusFilter}` : ""}.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted">
            Page {page} of {totalPages} · {total} deposits
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/paypal-deposits?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ""}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border px-3 py-1.5 hover:bg-surface transition"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/paypal-deposits?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ""}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border px-3 py-1.5 hover:bg-surface transition"
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
