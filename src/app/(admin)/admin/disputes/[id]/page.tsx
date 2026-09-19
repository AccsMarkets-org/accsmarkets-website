import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDate, formatCurrency } from "@/lib/utils";
import { PLATFORM_LABEL } from "@/lib/constants";
import { DisputePhaseControls } from "@/components/admin/DisputePhaseControls";
import { DisputeTimeline } from "@/components/admin/DisputeTimeline";
import { PHASE_LABELS, PHASE_COLORS, PHASE_DESCRIPTIONS } from "@/lib/dispute-phases";

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  OPEN:            { label: "Open",          className: "bg-danger/10 text-danger" },
  UNDER_REVIEW:    { label: "Under Review",  className: "bg-warning/10 text-warning" },
  RESOLVED_BUYER:  { label: "Buyer Won",     className: "bg-success/10 text-success" },
  RESOLVED_SELLER: { label: "Seller Won",    className: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400" },
  CLOSED:          { label: "Closed",        className: "bg-muted/10 text-muted" },
};

export default async function AdminDisputeDetailPage({ params }: { params: { id: string } }) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: params.id },
    include: {
      evidence: { orderBy: { submittedAt: "asc" } },
      timeline: { orderBy: { createdAt: "desc" }, take: 30 },
      escrow: {
        include: {
          listing: { select: { id: true, title: true, platform: true } },
          buyer: { select: { id: true, username: true, email: true } },
          seller: { select: { id: true, username: true, email: true } },
        },
      },
    },
  });
  if (!dispute) notFound();

  const style = STATUS_STYLE[dispute.status] ?? STATUS_STYLE.OPEN;
  const isActive = dispute.phase !== "FINAL";

  const buyerEvidence = dispute.evidence.filter((e) => e.userId === dispute.escrow.buyerId);
  const sellerEvidence = dispute.evidence.filter((e) => e.userId === dispute.escrow.sellerId);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/disputes" className="mb-1 inline-block text-sm text-brand-500 hover:underline">
            ← All disputes
          </Link>
          <h1 className="text-xl font-bold">{dispute.escrow.listing.title}</h1>
          <p className="text-sm text-muted">
            {PLATFORM_LABEL[dispute.escrow.listing.platform]} · Opened {formatDate(dispute.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill label={style.label} className={style.className} />
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PHASE_COLORS[dispute.phase]}`}>
            {PHASE_LABELS[dispute.phase]}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content - 2/3 */}
        <div className="lg:col-span-2 space-y-5">
          {/* Phase description */}
          <div className={`rounded-xl border px-4 py-3 text-sm ${PHASE_COLORS[dispute.phase]}`}>
            <strong>{PHASE_LABELS[dispute.phase]}:</strong> {PHASE_DESCRIPTIONS[dispute.phase]}
            {dispute.evidenceDeadline && dispute.phase === "EVIDENCE" && (
              <p className="mt-1 text-xs">
                Evidence deadline: <strong>{formatDate(dispute.evidenceDeadline)}</strong>
              </p>
            )}
          </div>

          {/* Dispute reason */}
          <Card>
            <h2 className="mb-2 font-semibold text-sm text-muted uppercase tracking-wide">Dispute reason</h2>
            <p className="text-sm">{dispute.reason}</p>
            {dispute.resolution && (
              <div className="mt-3 border-t border-surface-border pt-3">
                <p className="text-xs font-medium text-muted uppercase tracking-wide">Resolution</p>
                <p className="mt-1 text-sm">{dispute.resolution}</p>
              </div>
            )}
            {dispute.adminNotes && (
              <div className="mt-3 border-t border-surface-border pt-3">
                <p className="text-xs font-medium text-muted uppercase tracking-wide">Admin notes</p>
                <p className="mt-1 text-sm">{dispute.adminNotes}</p>
              </div>
            )}
            {dispute.appealReason && (
              <div className="mt-3 border-t border-surface-border pt-3">
                <p className="text-xs font-medium text-muted uppercase tracking-wide">Appeal reason</p>
                <p className="mt-1 text-sm">{dispute.appealReason}</p>
              </div>
            )}
          </Card>

          {/* Escrow summary */}
          <Card>
            <h2 className="mb-3 font-semibold">Escrow summary</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted">Buyer</dt>
                <dd className="font-medium">{dispute.escrow.buyer.username ?? dispute.escrow.buyer.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Seller</dt>
                <dd className="font-medium">{dispute.escrow.seller.username ?? dispute.escrow.seller.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Amount (seller)</dt>
                <dd className="font-medium">{formatCurrency(dispute.escrow.amount.toString())}</dd>
              </div>
            </dl>
            {dispute.mediationOffer !== null && dispute.mediationOffer !== undefined && (
              <div className="mt-3 border-t border-surface-border pt-3">
                <p className="text-xs font-medium text-muted uppercase tracking-wide">Mediation offer</p>
                <p className="mt-1 text-sm font-semibold">${Number(dispute.mediationOffer).toFixed(2)}</p>
                {dispute.mediationAccepted !== null && (
                  <p className="text-xs text-muted">{dispute.mediationAccepted ? "✅ Accepted" : "❌ Rejected"}</p>
                )}
              </div>
            )}
            <Link href={`/admin/escrows/${dispute.escrow.id}`} className="mt-3 inline-block text-sm text-brand-500 hover:underline">
              View escrow & chat →
            </Link>
          </Card>

          {/* Evidence */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h2 className="mb-2 font-semibold">
                Buyer evidence
                <span className="ml-2 text-xs font-normal text-muted">
                  ({dispute.escrow.buyer.username ?? dispute.escrow.buyer.email})
                </span>
              </h2>
              {buyerEvidence.length > 0 ? (
                <div className="space-y-3">
                  {buyerEvidence.map((e) => (
                    <div key={e.id} className="rounded-lg bg-surface p-3">
                      <p className="whitespace-pre-wrap text-sm">{e.statement}</p>
                      <p className="mt-1.5 text-xs text-muted">{formatDate(e.submittedAt)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted italic">No evidence submitted yet.</p>
              )}
            </Card>
            <Card>
              <h2 className="mb-2 font-semibold">
                Seller evidence
                <span className="ml-2 text-xs font-normal text-muted">
                  ({dispute.escrow.seller.username ?? dispute.escrow.seller.email})
                </span>
              </h2>
              {sellerEvidence.length > 0 ? (
                <div className="space-y-3">
                  {sellerEvidence.map((e) => (
                    <div key={e.id} className="rounded-lg bg-surface p-3">
                      <p className="whitespace-pre-wrap text-sm">{e.statement}</p>
                      <p className="mt-1.5 text-xs text-muted">{formatDate(e.submittedAt)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted italic">No evidence submitted yet.</p>
              )}
            </Card>
          </div>

          {/* Phase controls */}
          {isActive && (
            <Card>
              <h2 className="mb-4 font-semibold">Phase Controls</h2>
              <DisputePhaseControls
                disputeId={dispute.id}
                currentPhase={dispute.phase}
                mediationOffer={dispute.mediationOffer ? Number(dispute.mediationOffer) : null}
              />
            </Card>
          )}
        </div>

        {/* Timeline sidebar - 1/3 */}
        <div className="space-y-4">
          <Card>
            <h2 className="mb-4 font-semibold text-sm">Timeline</h2>
            <DisputeTimeline events={dispute.timeline.map((e) => ({
              id: e.id,
              eventType: e.eventType,
              actorId: e.actorId,
              description: e.description,
              createdAt: e.createdAt.toISOString(),
              metadata: e.metadata as Record<string, unknown> | null,
            }))} />
          </Card>
        </div>
      </div>
    </div>
  );
}
