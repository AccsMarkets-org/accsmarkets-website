import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function AdminDepositsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = searchParams.tab === "bank" ? "bank" : "crypto";

  const [cryptoDeposits, bankTransfers, pendingCrypto, pendingBank] = await Promise.all([
    tab === "crypto"
      ? prisma.cryptoWallet.findMany({
          where: { isManual: true },
          orderBy: { createdAt: "desc" },
          take: 60,
          include: { user: { select: { id: true, username: true, email: true } } },
        })
      : Promise.resolve([]),
    tab === "bank"
      ? prisma.bankTransferOrder.findMany({
          where: { status: { in: ["PENDING", "SENT", "VERIFIED", "REJECTED", "EXPIRED"] } },
          orderBy: { createdAt: "desc" },
          take: 60,
          include: {
            user: { select: { id: true, username: true, email: true } },
            bankAccount: { select: { bankName: true, accountName: true } },
          },
        })
      : Promise.resolve([]),
    prisma.cryptoWallet.count({ where: { isManual: true, status: "waiting" } }),
    prisma.bankTransferOrder.count({ where: { status: "SENT" } }),
  ]);

  const totalPending = pendingCrypto + pendingBank;

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        title="Deposits"
        badge={totalPending}
        badgeUrgent={totalPending > 0}
        subtitle="Manual crypto and bank transfer deposits"
      />

      {/* Tabs */}
      <div className="flex gap-1.5">
        {[
          { key: "crypto", label: "Crypto / Manual", count: pendingCrypto },
          { key: "bank",   label: "Bank Transfer",   count: pendingBank },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/admin/deposits?tab=${t.key}`}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === t.key ? "bg-brand-500 text-white" : "border border-surface-border bg-surface text-muted hover:text-foreground hover:border-brand-300"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                tab === t.key ? "bg-white/20 text-white" : "bg-warning text-white"
              }`}>
                {t.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Crypto deposits */}
      {tab === "crypto" && (
        <div className="flex flex-col gap-2">
          {cryptoDeposits.map((dep) => (
            <div
              key={dep.id}
              className={`rounded-2xl border p-4 ${dep.status === "waiting" ? "border-warning/30 bg-warning/5" : "border-surface-border bg-surface"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold">{formatCurrency(dep.amountUsd.toString())}</span>
                    <span className="rounded-full bg-surface-border px-2 py-0.5 text-xs font-medium text-foreground">
                      {dep.network}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      dep.status === "waiting" ? "bg-warning/10 text-warning"
                        : dep.status === "confirmed" ? "bg-success/10 text-success"
                        : "bg-danger/10 text-danger"
                    }`}>
                      {dep.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted">
                    <Link href={`/admin/users/${dep.user.id}`} className="text-brand-500 hover:underline">
                      {dep.user.username ?? dep.user.email}
                    </Link>
                    {" · "}
                    {formatDate(dep.createdAt)}
                  </p>
                  {dep.txHash && (
                    <p className="font-mono text-xs text-muted break-all">tx: {dep.txHash}</p>
                  )}
                  {dep.proofImageUrl && (
                    <a href={dep.proofImageUrl} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:underline">
                      View proof screenshot
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  )}
                </div>
                {dep.status === "waiting" && (
                  <AdminActionButtons
                    endpoint={`/api/admin/deposits/${dep.id}`}
                    actions={[
                      { label: "Confirm & credit", action: "confirm", variant: "primary", confirm: "Confirm this deposit and credit the user's wallet?" },
                      { label: "Reject", action: "reject", variant: "danger", promptReason: true },
                    ]}
                  />
                )}
              </div>
            </div>
          ))}
          {cryptoDeposits.length === 0 && <div className="py-16 text-center text-muted">No manual deposits.</div>}
        </div>
      )}

      {/* Bank transfers */}
      {tab === "bank" && (
        <div className="flex flex-col gap-2">
          {bankTransfers.map((bt) => (
            <div
              key={bt.id}
              className={`rounded-2xl border p-4 ${bt.status === "SENT" ? "border-warning/30 bg-warning/5" : "border-surface-border bg-surface"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-brand-600">{bt.referenceId}</span>
                    <span className="text-lg font-bold">{formatCurrency(bt.amountUsd.toString())}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      bt.status === "PENDING" ? "bg-muted/10 text-muted"
                        : bt.status === "SENT" ? "bg-warning/10 text-warning"
                        : bt.status === "VERIFIED" ? "bg-success/10 text-success"
                        : "bg-danger/10 text-danger"
                    }`}>
                      {bt.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted">
                    <Link href={`/admin/users/${bt.user.id}`} className="text-brand-500 hover:underline">
                      {bt.user.username ?? bt.user.email}
                    </Link>
                    {bt.bankAccount && ` · ${bt.bankAccount.bankName}`}
                    {" · "}
                    {formatDate(bt.createdAt)}
                  </p>
                  {bt.senderName && (
                    <p className="text-xs text-muted">Sender: {bt.senderName}</p>
                  )}
                  {bt.proofImageUrl && (
                    <a href={bt.proofImageUrl} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:underline">
                      View proof
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  )}
                </div>
                {bt.status === "SENT" && (
                  <AdminActionButtons
                    endpoint={`/api/admin/bank-transfers/${bt.id}`}
                    actions={[
                      { label: "Verify & credit", action: "verify", variant: "primary", promptAmount: true, confirm: "Enter amount received and credit wallet?" },
                      { label: "Reject", action: "reject", variant: "danger", promptReason: true },
                    ]}
                  />
                )}
              </div>
            </div>
          ))}
          {bankTransfers.length === 0 && <div className="py-16 text-center text-muted">No bank transfer orders.</div>}
        </div>
      )}
    </div>
  );
}
