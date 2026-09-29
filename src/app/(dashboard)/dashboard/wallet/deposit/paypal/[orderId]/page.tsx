"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn, formatCurrency } from "@/lib/utils";
import { ArrowLeft, Check } from "lucide-react";

interface PayPalAccount {
  label: string;
  paypalEmail: string;
  instructions: string | null;
  currency: string;
}

interface Order {
  id: string;
  referenceId: string;
  amountUsd: number;
  feeUsd: number;
  totalDue: number;
  status: "PENDING" | "SENT" | "VERIFIED" | "REJECTED" | "EXPIRED";
  sentAt: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  paypalAccount: PayPalAccount;
}

const STEPS = ["Order Created", "Payment Sent", "Under Review", "Credited"];

function activeStep(status: Order["status"]): number {
  if (status === "PENDING") return 0;
  if (status === "SENT") return 1;
  if (status === "VERIFIED") return 3;
  return -1; // REJECTED / EXPIRED shown separately
}

function CopyRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-surface-border last:border-0">
      <span className="text-sm text-muted shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn("text-sm font-medium truncate", highlight && "font-mono text-brand-600")}>
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-surface-border px-2 py-0.5 text-xs text-muted hover:bg-surface transition"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-success" aria-hidden />
              <span className="sr-only">Copied</span>
            </>
          ) : (
            "Copy"
          )}
        </button>
      </div>
    </div>
  );
}

export default function PayPalDepositConfirmationPage() {
  const params = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSentForm, setShowSentForm] = useState(false);
  const [senderEmail, setSenderEmail] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [sending, setSending] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/wallet/deposit/paypal/${params.orderId}`);
      if (!res.ok) { setError("Order not found."); return; }
      const data = await res.json();
      const o = data.order;
      setOrder({
        ...o,
        amountUsd: Number(o.amountUsd),
        feeUsd: Number(o.feeUsd),
        totalDue: Number(o.totalDue),
      });
    } catch {
      setError("Failed to load order.");
    }
  }, [params.orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Poll while PENDING or SENT
  useEffect(() => {
    if (!order) return;
    if (order.status !== "PENDING" && order.status !== "SENT") return;
    const id = setInterval(fetchOrder, 10_000);
    return () => clearInterval(id);
  }, [order, fetchOrder]);

  async function markSent(e: React.FormEvent) {
    e.preventDefault();
    if (!senderEmail.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/wallet/deposit/paypal/${params.orderId}/mark-sent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderPaypalEmail: senderEmail.trim(),
          transactionId: transactionId.trim() || undefined,
          proofImageUrl: proofUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Payment marked as sent!");
      setShowSentForm(false);
      await fetchOrder();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-danger">{error}</p>
        <Link href="/dashboard/wallet" className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-500 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to wallet
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-muted text-sm">Loading…</p>
      </div>
    );
  }

  const step = activeStep(order.status);
  const isRejected = order.status === "REJECTED" || order.status === "EXPIRED";

  const paypalRows: { label: string; value: string; highlight?: boolean }[] = [
    { label: "Send to (PayPal — Friends & Family)", value: order.paypalAccount.paypalEmail, highlight: true },
    { label: "Account name", value: order.paypalAccount.label },
    { label: "Note / Memo", value: order.referenceId, highlight: true },
    { label: "Amount to Send", value: `${formatCurrency(order.totalDue)} ${order.paypalAccount.currency}` },
  ];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-6">
      <div>
        <Link href="/dashboard/wallet" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to wallet
        </Link>
        <h1 className="mt-2 text-2xl font-bold">PayPal Deposit</h1>
        <p className="text-sm text-muted">Reference: <span className="font-mono font-semibold text-foreground">{order.referenceId}</span></p>
      </div>

      {/* Tracker */}
      {!isRejected && (
        <Card>
          <div className="flex items-start gap-0">
            {STEPS.map((label, i) => {
              const done = i <= step;
              const active = i === step + 1 && step < 3;
              return (
                <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full items-center">
                    {i > 0 && (
                      <div className={cn("h-0.5 flex-1", i - 1 <= step ? "bg-success" : "bg-surface-border")} />
                    )}
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        done ? "bg-success text-white" : active ? "border-2 border-brand-400 bg-brand-500/10 text-brand-600" : "border-2 border-surface-border bg-background text-muted",
                      )}
                    >
                      {done ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : i + 1}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={cn("h-0.5 flex-1", done && i < step ? "bg-success" : "bg-surface-border")} />
                    )}
                  </div>
                  <span className="text-center text-[11px] leading-tight text-muted px-1">{label}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Rejection notice */}
      {isRejected && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm font-semibold text-danger">
            {order.status === "REJECTED" ? "Deposit rejected" : "Order expired"}
          </p>
          {order.rejectionReason && (
            <p className="mt-1 text-sm text-muted">{order.rejectionReason}</p>
          )}
        </div>
      )}

      {/* PayPal details */}
      <Card>
        <p className="mb-3 text-sm font-semibold">PayPal Details</p>
        {paypalRows.map((row) => (
          <CopyRow key={row.label} {...row} />
        ))}
        {order.paypalAccount.instructions && (
          <p className="mt-3 text-xs text-muted">{order.paypalAccount.instructions}</p>
        )}
      </Card>

      {/* Instructions */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm space-y-1.5">
        <p className="font-semibold text-amber-800 dark:text-amber-300">Important instructions</p>
        <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-400 text-[13px]">
          <li>Send as <strong>Friends &amp; Family</strong> — payments sent as goods/services may be refused or delayed.</li>
          <li>Include <span className="font-mono font-bold">{order.referenceId}</span> in the payment note.</li>
          <li>Send exactly <strong>{formatCurrency(order.totalDue)}</strong> to avoid processing delays.</li>
          <li>Processing takes a few hours to 1 business day after we receive and verify your payment.</li>
        </ul>
      </div>

      {/* Mark sent */}
      {order.status === "PENDING" && !showSentForm && (
        <Button onClick={() => setShowSentForm(true)} className="w-full">
          I Have Sent the Payment
        </Button>
      )}

      {order.status === "PENDING" && showSentForm && (
        <Card>
          <p className="mb-3 text-sm font-semibold">Confirm your payment</p>
          <form onSubmit={markSent} className="flex flex-col gap-4">
            <Input
              label="Your PayPal email (that you sent from)"
              type="email"
              required
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="PayPal transaction ID (optional)"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. 9AB123456C789012D"
            />
            <Input
              label="Proof of payment URL (optional)"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://..."
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowSentForm(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" isLoading={sending} className="flex-1">
                Confirm
              </Button>
            </div>
          </form>
        </Card>
      )}

      {order.status === "SENT" && (
        <div className="rounded-xl border border-brand-200 bg-brand-500/10 p-4 text-center">
          <p className="text-sm font-semibold text-brand-700">Payment received — under review</p>
          <p className="mt-1 text-xs text-muted">We&apos;ll notify you once your deposit is verified and credited.</p>
        </div>
      )}

      {/* Download receipt */}
      {order.status === "VERIFIED" && (
        <a
          href={`/api/wallet/deposit/paypal/${order.id}/invoice`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-xl border border-surface-border bg-surface py-2.5 text-center text-sm font-medium hover:bg-surface/80 transition"
        >
          Download Receipt
        </a>
      )}

      {/* Support card */}
      <div className="rounded-xl border border-surface-border bg-surface p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Need help?</p>
          <p className="text-xs text-muted">Our support team can assist with this deposit.</p>
        </div>
        <Link
          href={`/dashboard/support/new?category=PAYMENT`}
          className="rounded-xl border border-brand-300 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 transition"
        >
          Chat with support
        </Link>
      </div>
    </div>
  );
}
