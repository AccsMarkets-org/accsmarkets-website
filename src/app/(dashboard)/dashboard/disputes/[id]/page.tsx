export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Handshake, LifeBuoy, X } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { PLATFORM_LABEL } from "@/lib/constants";
import { PHASE_COLORS, PHASE_DESCRIPTIONS, PHASE_LABELS } from "@/lib/dispute-phases";
import { DisputeTimeline } from "@/components/admin/DisputeTimeline";
import { DisputeEvidenceForm } from "@/components/escrow/DisputeEvidenceForm";
import { DISPUTE_STATUS_STYLE } from "@/components/disputes/constants";
import { loadUserDispute } from "@/app/api/disputes/_shared";

export const metadata = { title: "Dispute" };

export default async function DisputeDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const dispute = await loadUserDispute(params.id, userId);
  if (!dispute) notFound();

  const st = DISPUTE_STATUS_STYLE[dispute.status];
  const counterpartyName = dispute.counterparty.username ?? dispute.counterparty.name ?? "Counterparty";
  const isUnresolved = dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW";
  const canSubmitEvidence = isUnresolved && dispute.phase === "EVIDENCE" && dispute.escrow.status === "DISPUTED";
  const deadlinePassed = dispute.evidenceDeadline ? dispute.evidenceDeadline.getTime() < Date.now() : false;
  const platform = PLATFORM_LABEL[dispute.escrow.listing.platform as keyof typeof PLATFORM_LABEL] ?? dispute.escrow.listing.platform;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/dashboard/disputes" className="mb-1 inline-flex items-center gap-1.5 text-sm text-brand-500 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            All disputes
          </Link>
          <h1 className="text-xl font-black text-foreground sm:text-2xl">{dispute.escrow.listing.title}</h1>
          <p className="text-sm text-muted">
            {platform} · {dispute.role === "buyer" ? "You're buying" : "You're selling"} · with {counterpartyName} · Opened {formatDate(dispute.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill label={st.label} className={st.className} />
          <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", PHASE_COLORS[dispute.phase])}>
            {PHASE_LABELS[dispute.phase]}
          </span>
        </div>
      </div>

      {/* Outcome banner */}
      {dispute.outcome && (
        <div className={cn(
          "flex items-start gap-3 rounded-2xl border px-4 py-3",
          dispute.outcome === "won" ? "border-success/30 bg-success/5" : "border-surface-border bg-surface",
        )}>
          {dispute.outcome === "won"
            ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
            : <X className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />}
          <div>
            <p className="text-sm font-bold text-foreground">
              {dispute.outcome === "won" ? "This dispute was resolved in your favour." : "This dispute was not resolved in your favour."}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {dispute.resolvedAt ? `Decided ${formatDate(dispute.resolvedAt)}. ` : ""}
              Funds were {dispute.status === "RESOLVED_BUYER" ? "refunded to the buyer" : "released to the seller"}. Questions about the decision? Open a support ticket below.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Phase description */}
          <div className={cn("rounded-xl border px-4 py-3 text-sm", PHASE_COLORS[dispute.phase])}>
            <strong>{PHASE_LABELS[dispute.phase]}:</strong> {PHASE_DESCRIPTIONS[dispute.phase]}
            {dispute.evidenceDeadline && dispute.phase === "EVIDENCE" && (
              <p className="mt-1 flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" aria-hidden />
                Evidence deadline: <strong>{formatDate(dispute.evidenceDeadline)}</strong>{deadlinePassed && " (passed)"}
              </p>
            )}
          </div>

          {/* Reason */}
          <Card>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
              Dispute reason <span className="ml-1 font-normal normal-case tracking-normal">· opened by {dispute.openedByMe ? "you" : counterpartyName}</span>
            </h2>
            <p className="whitespace-pre-wrap text-sm text-foreground">{dispute.reason}</p>
            {dispute.appealReason && (
              <div className="mt-3 border-t border-surface-border pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Appeal {dispute.appealedAt ? `· ${formatDate(dispute.appealedAt)}` : ""}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{dispute.appealReason}</p>
                {dispute.appealReviewedAt && <p className="mt-1 text-xs text-muted">Reviewed {formatDate(dispute.appealReviewedAt)}</p>}
              </div>
            )}
          </Card>

          {/* Escrow summary */}
          <Card>
            <h2 className="mb-3 font-semibold">Escrow summary</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted">Your role</dt>
                <dd className="font-medium capitalize">{dispute.role}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Counterparty</dt>
                <dd className="font-medium">{counterpartyName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Amount</dt>
                <dd className="font-medium">{formatCurrency(dispute.escrow.amount)}</dd>
              </div>
            </dl>
            {dispute.mediationOffer !== null && (
              <div className="mt-3 border-t border-surface-border pt-3">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                  <Handshake className="h-3.5 w-3.5" aria-hidden />
                  Mediation offer
                </p>
                <p className="mt-1 text-sm font-semibold">{formatCurrency(dispute.mediationOffer)}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {dispute.mediationAccepted === null
                    ? "Our team proposed a settlement. Reply in the escrow chat or open a support ticket to accept or decline."
                    : dispute.mediationAccepted ? "Accepted" : "Declined"}
                </p>
              </div>
            )}
            <Link href={`/dashboard/escrows/${dispute.escrow.id}`} className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand-500 hover:underline">
              View escrow & chat
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Card>

          {/* Evidence */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h2 className="mb-2 font-semibold">Your evidence</h2>
              {dispute.myEvidence.length > 0 ? (
                <div className="space-y-3">
                  {dispute.myEvidence.map((e) => (
                    <div key={e.id} className="rounded-lg bg-surface-border/40 p-3">
                      <p className="whitespace-pre-wrap text-sm">{e.statement}</p>
                      <p className="mt-1.5 text-xs text-muted">{formatDate(e.submittedAt)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic text-muted">
                  {canSubmitEvidence ? "You haven't submitted a statement yet — use the form below." : "No statement submitted."}
                </p>
              )}
            </Card>
            <Card>
              <h2 className="mb-2 font-semibold">
                {counterpartyName}&apos;s evidence
              </h2>
              <p className="text-sm text-muted">
                {dispute.theirEvidenceCount > 0
                  ? `${dispute.theirEvidenceCount} statement${dispute.theirEvidenceCount !== 1 ? "s" : ""} submitted.`
                  : "Nothing submitted yet."}
              </p>
              <p className="mt-2 text-xs text-muted">Statements are reviewed by our team and aren&apos;t shared between parties.</p>
            </Card>
          </div>

          {/* The form's own "already submitted" state duplicates the card above, so only mount it while a statement is still due. */}
          {canSubmitEvidence && dispute.myEvidence.length === 0 && (
            <DisputeEvidenceForm escrowId={dispute.escrow.id} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Card>
            <h2 className="mb-4 font-semibold">Timeline</h2>
            <DisputeTimeline events={dispute.timeline.map((ev) => ({ ...ev, createdAt: ev.createdAt.toISOString() }))} />
          </Card>

          <Card className="border-brand-200 bg-gradient-to-br from-brand-50 to-white dark:border-brand-900/50 dark:from-brand-950/30 dark:to-background">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400">
                <LifeBuoy className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">Need help with this dispute?</p>
                <p className="mt-0.5 text-xs text-muted">Talk to our support team — the ticket will be linked to this escrow.</p>
                <Link
                  href={`/dashboard/support/new?escrowId=${encodeURIComponent(dispute.escrow.id)}&category=ESCROW`}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-brand-600"
                >
                  Get help
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
