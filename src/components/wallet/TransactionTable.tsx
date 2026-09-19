import { formatCurrency, formatDate } from "@/lib/utils";
import { isCreditTransaction } from "@/lib/constants";
import type { Transaction } from "@prisma/client";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-warning/10 text-warning",
  COMPLETED: "bg-success/10 text-success",
  FAILED: "bg-danger/10 text-danger",
  CANCELLED: "bg-muted/10 text-muted",
};

export function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No transactions yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-muted">
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 pr-4 font-medium">Amount</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const credit = isCreditTransaction(tx.type);
            return (
              <tr key={tx.id} className="border-b border-surface-border last:border-0">
                <td className="py-3 pr-4 text-foreground">{tx.type.replace(/_/g, " ")}</td>
                <td className={`py-3 pr-4 font-medium ${credit ? "text-success" : "text-foreground"}`}>
                  {credit ? "+" : "-"}
                  {formatCurrency(tx.amount.toString())}
                </td>
                <td className="py-3 pr-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[tx.status]}`}>
                    {tx.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-muted">{formatDate(tx.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
