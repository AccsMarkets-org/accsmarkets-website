import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { AdminPagination } from "@/components/ui/AdminPagination";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { TransactionType, Prisma } from "@prisma/client";

const PAGE_SIZE = 100;

const TYPE_LABEL: Record<TransactionType, string> = {
  DEPOSIT:        "Deposit",
  WITHDRAWAL:     "Withdrawal",
  ESCROW_PAYMENT: "Escrow payment",
  ESCROW_RELEASE: "Escrow release",
  PLATFORM_FEE:   "Platform fee",
  REFUND:         "Refund",
  WALLET_CREDIT:  "Credit",
  WALLET_DEBIT:   "Debit",
  PROMOTION:      "Promotion",
  BUMP:           "Bump",
  SUBSCRIPTION:   "Subscription",
};

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  PENDING:   { label: "Pending",   className: "bg-warning/10 text-warning" },
  COMPLETED: { label: "Completed", className: "bg-success/10 text-success" },
  FAILED:    { label: "Failed",    className: "bg-danger/10 text-danger" },
  CANCELLED: { label: "Cancelled", className: "bg-muted/10 text-muted" },
};

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: { type?: string; status?: string; page?: string; q?: string; from?: string; to?: string };
}) {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) redirect("/admin?denied=1");

  const typeFilter = searchParams.type as TransactionType | undefined;
  const statusFilter = searchParams.status;
  const q = searchParams.q?.trim() ?? "";
  const from = searchParams.from ? new Date(searchParams.from) : undefined;
  const to = searchParams.to ? new Date(searchParams.to + "T23:59:59.999Z") : undefined;
  const page = Math.max(0, Number(searchParams.page ?? 0));

  const where: Prisma.TransactionWhereInput = {
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(statusFilter ? { status: statusFilter as "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(q ? {
      user: {
        OR: [
          { email: { contains: q } },
          { username: { contains: q } },
          { name: { contains: q } },
        ],
      },
    } : {}),
  };

  const transactions = await prisma.transaction.findMany({
    where,
    include: { user: { select: { id: true, username: true, email: true } } },
    orderBy: { createdAt: "desc" },
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });

  const hasMore = transactions.length > PAGE_SIZE;
  const pageTxns = hasMore ? transactions.slice(0, PAGE_SIZE) : transactions;

  const typeOptions = Object.keys(TYPE_LABEL) as TransactionType[];

  const exportParams = new URLSearchParams();
  if (typeFilter) exportParams.set("type", typeFilter);
  if (from) exportParams.set("from", searchParams.from!);
  if (to) exportParams.set("to", searchParams.to!);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <a
          href={`/api/admin/transactions/export${exportParams.size ? `?${exportParams}` : ""}`}
          className="rounded-xl border border-surface-border px-3 py-1.5 text-sm font-medium hover:bg-surface-border transition"
        >
          Export CSV
        </a>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by user email/username…"
          className="h-9 w-56 rounded-xl border border-surface-border bg-surface px-3 text-base focus:border-brand-400 focus:outline-none sm:text-sm"
        />
        <select name="type" defaultValue={typeFilter ?? ""} className="h-9 rounded-xl border border-surface-border bg-background px-3 text-base sm:text-sm">
          <option value="">All types</option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>{TYPE_LABEL[t]}</option>
          ))}
        </select>
        <select name="status" defaultValue={statusFilter ?? ""} className="h-9 rounded-xl border border-surface-border bg-background px-3 text-base sm:text-sm">
          <option value="">All statuses</option>
          {Object.keys(STATUS_STYLE).map((s) => (
            <option key={s} value={s}>{STATUS_STYLE[s].label}</option>
          ))}
        </select>
        <input
          type="date"
          name="from"
          defaultValue={searchParams.from ?? ""}
          className="h-9 rounded-xl border border-surface-border bg-background px-3 text-base sm:text-sm"
        />
        <input
          type="date"
          name="to"
          defaultValue={searchParams.to ?? ""}
          className="h-9 rounded-xl border border-surface-border bg-background px-3 text-base sm:text-sm"
        />
        <button type="submit" className="h-9 rounded-xl bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 transition">
          Filter
        </button>
        {(q || typeFilter || statusFilter || from || to) && (
          <a href="/admin/transactions" className="h-9 flex items-center rounded-xl border border-surface-border px-3 text-sm text-muted hover:text-foreground transition">
            Clear
          </a>
        )}
      </form>

      <div className="flex flex-col gap-2">
        {pageTxns.map((tx) => {
          const style = STATUS_STYLE[tx.status] ?? STATUS_STYLE.PENDING;
          return (
            <Card key={tx.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{TYPE_LABEL[tx.type] ?? tx.type}</span>
                <span className="text-xs text-muted">
                  <Link href={`/admin/users/${tx.user.id}`} className="text-brand-500 hover:underline">
                    {tx.user.username ?? tx.user.email}
                  </Link>
                  {" "}· {formatDate(tx.createdAt)}
                  {tx.escrowId && (
                    <>
                      {" "}·{" "}
                      <Link href={`/admin/escrows/${tx.escrowId}`} className="text-brand-500 hover:underline font-mono text-[10px]">
                        escrow {tx.escrowId.slice(-6)}
                      </Link>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{formatCurrency(tx.amount.toString())}</span>
                <StatusPill label={style.label} className={style.className} />
              </div>
            </Card>
          );
        })}
        {pageTxns.length === 0 && <p className="py-10 text-center text-muted">No transactions found.</p>}
      </div>
      <AdminPagination
        page={page}
        hasMore={hasMore}
        baseHref="/admin/transactions"
        extraParams={{ type: typeFilter, status: statusFilter, q: q || undefined, from: searchParams.from, to: searchParams.to }}
      />
    </div>
  );
}
