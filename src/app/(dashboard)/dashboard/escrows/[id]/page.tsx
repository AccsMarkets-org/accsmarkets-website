import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptCredentials } from "@/lib/credentials-crypto";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { EscrowStepper } from "@/components/escrow/EscrowStepper";
import { EscrowActions } from "@/components/escrow/EscrowActions";
import { ReviewForm } from "@/components/escrow/ReviewForm";
import { ReportButton } from "@/components/ui/ReportButton";
import { ESCROW_STATUS_STYLE, PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DisputeEvidenceForm } from "@/components/escrow/DisputeEvidenceForm";
import { MilestoneChecklist, ProposeMilestones } from "@/components/escrow/MilestoneChecklist";
import { TransferCountdown } from "@/components/escrow/TransferCountdown";
import { EscrowLiveRefresh } from "@/components/escrow/EscrowLiveRefresh";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default async function EscrowDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const escrow = await prisma.escrow.findUnique({
    where: { id: params.id },
    include: {
      listing: { select: { id: true, title: true, platform: true, accountUrl: true, lifetimeViews: true, lifetimeRevenue: true, channelRpm: true, audienceLanguage: true, strikeCount: true, warningCount: true, adsenseStatus: true } },
      buyer: { select: { id: true, username: true, name: true } },
      seller: { select: { id: true, username: true, name: true } },
      dispute: { include: { evidence: true } },
      reviews: true,
      milestones: { orderBy: { createdAt: "asc" } },
      managerEmail: { select: { address: true } },
    },
  });
  if (!escrow) notFound();

  const [transferPolicy, platformSettings] = await Promise.all([
    prisma.platformTransferPolicy.findUnique({ where: { platform: escrow.listing.platform } }),
    prisma.platformSettings.findUnique({ where: { id: "singleton" }, select: { officialSupportUserId: true } }),
  ]);

  const isBuyer = escrow.buyerId === userId;
  const isSeller = escrow.sellerId === userId;
  const isAdmin = session!.user.role === "ADMIN";
  if (!isBuyer && !isSeller && !isAdmin) notFound();

  // Server-side decrypt for the buyer/admin once submitted (never exposed to the seller page render).
  let credentials: string | null = null;
  if (
    escrow.credentialsPayload &&
    (isBuyer || isAdmin) &&
    ["SUBMITTED", "VERIFIED", "IN_TRANSFER", "COMPLETED", "DISPUTED"].includes(escrow.status)
  ) {
    try {
      credentials = decryptCredentials(escrow.credentialsPayload);
    } catch {
      credentials = null;
    }
  }

  const style = ESCROW_STATUS_STYLE[escrow.status];

  // Review data — only shown when escrow is COMPLETED and user is a party (not admin)
  const canReview = (isBuyer || isSeller) && escrow.status === "COMPLETED";
  const myReview = canReview ? escrow.reviews.find((r) => r.reviewerId === userId) : undefined;
  const theirReview = canReview ? escrow.reviews.find((r) => r.reviewerId !== userId) : undefined;
  const revieweeId = isBuyer ? escrow.sellerId : escrow.buyerId;
  const revieweeName = isBuyer
    ? (escrow.seller.username ?? escrow.seller.name ?? "Seller")
    : (escrow.buyer.username ?? escrow.buyer.name ?? "Buyer");
  const counterpartyId = isBuyer ? escrow.sellerId : escrow.buyerId;

  const platformColor = PLATFORM_COLOR[escrow.listing.platform as keyof typeof PLATFORM_COLOR] ?? "#888";
  const platformLabelStr = PLATFORM_LABEL[escrow.listing.platform] ?? escrow.listing.platform;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 pb-10">

      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl px-5 py-5 shadow-lg"
        style={{ background: `linear-gradient(135deg, ${platformColor}22 0%, ${platformColor}08 100%)`, borderLeft: `4px solid ${platformColor}` }}
      >
        {/* Back link */}
        <Link
          href="/dashboard/escrows"
          className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-foreground w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          All Escrows
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[13px] font-black text-white shadow-md"
              style={{ backgroundColor: platformColor }}
            >
              {platformLabelStr.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-foreground leading-tight truncate">{escrow.listing.title}</h1>
              <p className="text-xs text-muted mt-0.5">{platformLabelStr} · Opened {formatDate(escrow.createdAt)}</p>
            </div>
          </div>
          <StatusPill label={style.label} className={style.className} />
        </div>
      </div>

      {/* ── Progress Stepper ─────────────────────────────────────────────── */}
      <Card>
        <EscrowStepper status={escrow.status} transferModel={escrow.transferModel} />
      </Card>

      <EscrowLiveRefresh escrowId={escrow.id} />

      {/* Transfer/completion countdown — countdownEndsAt (the transfer-in-progress
          window) takes priority once it exists; transferDeadline is the earlier
          verification-stage deadline. */}
      {(escrow.countdownEndsAt ?? escrow.transferDeadline) && (
        <TransferCountdown deadline={(escrow.countdownEndsAt ?? escrow.transferDeadline)!.toISOString()} status={escrow.status} />
      )}

      {/* Platform policy notice */}
      {transferPolicy && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 mt-0.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            <strong className="text-blue-800 dark:text-blue-300">{platformLabelStr}</strong> transfers typically take{" "}
            <strong>{transferPolicy.transferDays} business day{transferPolicy.transferDays !== 1 ? "s" : ""}</strong> to complete.
            {transferPolicy.policyNote && ` ${transferPolicy.policyNote}`}
          </p>
        </div>
      )}

      {/* ── Deal summary + Actions ────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Deal summary */}
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-background">
          <div className="flex items-center gap-2 border-b border-surface-border bg-surface px-4 py-3">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-muted">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
            </svg>
            <h2 className="text-sm font-bold text-foreground">Deal Summary</h2>
          </div>
          <dl className="flex flex-col divide-y divide-surface-border text-sm">
            {[
              { label: "Sale price", value: formatCurrency(escrow.amount.toString()), bold: true },
              { label: "Escrow fee", value: formatCurrency(escrow.feeAmount.toString()) },
              { label: "Total charged", value: formatCurrency(escrow.totalCharged.toString()), bold: true },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3">
                <dt className="text-muted">{row.label}</dt>
                <dd className={row.bold ? "font-black text-foreground" : "font-medium text-foreground"}>{row.value}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-muted">Buyer</dt>
              <dd className="flex items-center gap-1.5 font-semibold text-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-[9px] font-black text-brand-600">
                  {(escrow.buyer.username ?? escrow.buyer.name ?? "B").slice(0, 1).toUpperCase()}
                </span>
                {escrow.buyer.username ?? escrow.buyer.name}
              </dd>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-muted">Seller</dt>
              <dd className="flex items-center gap-1.5 font-semibold text-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  {(escrow.seller.username ?? escrow.seller.name ?? "S").slice(0, 1).toUpperCase()}
                </span>
                {escrow.seller.username ?? escrow.seller.name}
              </dd>
            </div>
            {escrow.ownershipEmail && (isBuyer || isAdmin) && (
              <div className="flex items-center justify-between px-4 py-3">
                <dt className="text-muted">Ownership email</dt>
                <dd className="font-mono text-xs text-foreground">{escrow.ownershipEmail}</dd>
              </div>
            )}
            {escrow.transferDeadline && (
              <div className="flex items-center justify-between px-4 py-3">
                <dt className="text-muted">Verification deadline</dt>
                <dd className="font-medium text-foreground">{formatDate(escrow.transferDeadline)}</dd>
              </div>
            )}
            {escrow.countdownEndsAt && (
              <div className="flex items-center justify-between px-4 py-3">
                <dt className="text-muted">Transfer countdown ends</dt>
                <dd className="font-medium text-foreground">{formatDate(escrow.countdownEndsAt)}</dd>
              </div>
            )}
          </dl>
          {escrow.dispute && (
            <div className="mx-4 mb-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3 py-3">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-danger mt-0.5">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <div>
                <p className="text-xs font-bold text-danger">Dispute Open</p>
                <p className="mt-0.5 text-xs text-muted">{escrow.dispute.reason}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-background">
          <div className="flex items-center gap-2 border-b border-surface-border bg-surface px-4 py-3">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-muted">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
            </svg>
            <h2 className="text-sm font-bold text-foreground">Actions</h2>
          </div>
          <div className="p-4">
            <EscrowActions
              escrowId={escrow.id}
              status={escrow.status}
              isBuyer={isBuyer}
              isSeller={isSeller}
              isAdmin={isAdmin}
              credentials={credentials}
              isHighValue={escrow.isHighValue}
              videoVerificationRequired={escrow.videoVerificationRequired}
              videoVerificationCompletedAt={escrow.videoVerificationCompletedAt}
              transferModel={escrow.transferModel}
              managerEmail={escrow.managerEmail}
              countdownEndsAt={escrow.countdownEndsAt}
              sellerConfirmedHandoverAt={escrow.sellerConfirmedHandoverAt}
            />
          </div>
        </div>
      </div>

      {/* Milestones */}
      {escrow.milestones.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-background">
          <div className="flex items-center gap-2 border-b border-surface-border bg-surface px-4 py-3">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-muted">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <h2 className="text-sm font-bold text-foreground">Milestone Payments</h2>
          </div>
          <div className="p-4">
            <MilestoneChecklist
              escrowId={escrow.id}
              milestones={escrow.milestones.map((m) => ({
                id: m.id,
                description: m.description,
                amount: m.amount.toString(),
                status: m.status,
                completedAt: m.completedAt?.toISOString() ?? null,
              }))}
              isBuyer={isBuyer}
              escrowStatus={escrow.status}
            />
          </div>
        </div>
      )}

      {/* Propose milestones */}
      {isSeller && escrow.status === "FUNDED" && escrow.milestones.length === 0 && (
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-background">
          <div className="flex items-center gap-2 border-b border-surface-border bg-surface px-4 py-3">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-muted">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
            </svg>
            <h2 className="text-sm font-bold text-foreground">Split into Milestones <span className="text-muted font-normal">(optional)</span></h2>
          </div>
          <div className="p-4">
            <ProposeMilestones escrowId={escrow.id} escrowAmount={Number(escrow.amount)} />
          </div>
        </div>
      )}

      {/* Support */}
      <div className="overflow-hidden rounded-2xl border border-brand-100 dark:border-brand-900/50 bg-gradient-to-br from-brand-50 to-white dark:from-brand-950/30 dark:to-background">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Need help with this escrow?</p>
              <p className="text-xs text-muted mt-0.5">Our support team responds directly in messages.</p>
            </div>
          </div>
          {platformSettings?.officialSupportUserId ? (
            <Link
              href={`/dashboard/messages/${platformSettings.officialSupportUserId}?context=escrow_${escrow.id}`}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2 text-sm font-bold text-white hover:bg-brand-600 transition"
            >
              Chat Support
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            </Link>
          ) : (
            <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
              Available
            </span>
          )}
        </div>
      </div>

      {canReview && (
        <ReviewForm
          escrowId={escrow.id}
          revieweeId={revieweeId}
          revieweeName={revieweeName}
          existing={myReview ? { rating: myReview.rating, comment: myReview.comment, reviewer: isBuyer ? escrow.buyer : escrow.seller } : undefined}
          counterpartyReview={theirReview && myReview ? { rating: theirReview.rating, comment: theirReview.comment, reviewer: isBuyer ? escrow.seller : escrow.buyer } : undefined}
        />
      )}

      {escrow.status === "DISPUTED" && escrow.dispute && (isBuyer || isSeller) && (
        <DisputeEvidenceForm
          escrowId={escrow.id}
          existingStatement={escrow.dispute.evidence.find((e) => e.userId === userId)?.statement}
        />
      )}

      {(isBuyer || isSeller) && (
        <div className="flex justify-end">
          <ReportButton targetType="USER" targetId={counterpartyId} label="Report this user" />
        </div>
      )}
    </div>
  );
}
