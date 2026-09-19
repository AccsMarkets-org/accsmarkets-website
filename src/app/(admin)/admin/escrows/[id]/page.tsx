import { notFound } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptCredentials } from "@/lib/credentials-crypto";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { EscrowActions } from "@/components/escrow/EscrowActions";
import { EscrowDurationControl } from "@/components/admin/EscrowDurationControl";
import { EscrowLiveRefresh } from "@/components/escrow/EscrowLiveRefresh";
import { ESCROW_STATUS_STYLE, PLATFORM_LABEL } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

const EscrowChat = dynamic(
  () => import("@/components/escrow/EscrowChat").then((m) => ({ default: m.EscrowChat })),
  { ssr: false },
);

export default async function AdminEscrowDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") notFound();

  const escrow = await prisma.escrow.findUnique({
    where: { id: params.id },
    include: {
      listing: { select: { id: true, title: true, platform: true } },
      buyer: { select: { id: true, username: true, name: true, email: true } },
      seller: { select: { id: true, username: true, name: true, email: true } },
      dispute: { include: { evidence: true } },
      reviews: true,
      milestones: { orderBy: { createdAt: "asc" } },
      managerEmail: { select: { address: true } },
    },
  });
  if (!escrow) notFound();

  let credentials: string | null = null;
  if (escrow.credentialsPayload) {
    try {
      credentials = decryptCredentials(escrow.credentialsPayload);
    } catch {
      credentials = null;
    }
  }

  const style = ESCROW_STATUS_STYLE[escrow.status];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <EscrowLiveRefresh escrowId={escrow.id} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/escrows" className="mb-1 block text-sm text-muted hover:text-brand-600">
            ← All escrows
          </Link>
          <h1 className="text-2xl font-bold">{escrow.listing.title}</h1>
          <p className="text-sm text-muted">
            {PLATFORM_LABEL[escrow.listing.platform]} · Escrow opened {formatDate(escrow.createdAt)}
          </p>
        </div>
        <StatusPill label={style.label} className={style.className} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Deal summary</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Sale price</dt>
              <dd className="font-medium">{formatCurrency(escrow.amount.toString())}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Fee</dt>
              <dd className="font-medium">{formatCurrency(escrow.feeAmount.toString())}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Total charged</dt>
              <dd className="font-medium">{formatCurrency(escrow.totalCharged.toString())}</dd>
            </div>
            <div className="flex justify-between border-t border-surface-border pt-2">
              <dt className="text-muted">Transfer model</dt>
              <dd className="font-medium">{escrow.transferModel ?? "Legacy (credentials)"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">High value</dt>
              <dd className="font-medium">{escrow.isHighValue ? "Yes" : "No"}</dd>
            </div>
            {escrow.countdownEndsAt && (
              <div className="flex justify-between">
                <dt className="text-muted">Countdown ends</dt>
                <dd className="font-medium">{formatDate(escrow.countdownEndsAt)}</dd>
              </div>
            )}
            {escrow.verifiedBy && (
              <div className="flex justify-between">
                <dt className="text-muted">Verified by</dt>
                <dd className="font-medium font-mono text-xs">{escrow.verifiedBy}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Parties</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Buyer</dt>
              <dd>
                <Link href={`/admin/users?q=${escrow.buyer.email}`} className="hover:text-brand-600">
                  {escrow.buyer.username ?? escrow.buyer.name}
                </Link>
                <span className="ml-1 text-xs text-muted">({escrow.buyer.email})</span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Seller</dt>
              <dd>
                <Link href={`/admin/users?q=${escrow.seller.email}`} className="hover:text-brand-600">
                  {escrow.seller.username ?? escrow.seller.name}
                </Link>
                <span className="ml-1 text-xs text-muted">({escrow.seller.email})</span>
              </dd>
            </div>
            {escrow.managerEmail && (
              <div className="flex justify-between">
                <dt className="text-muted">Pool email</dt>
                <dd className="font-mono text-xs">{escrow.managerEmail.address}</dd>
              </div>
            )}
            {escrow.ownershipEmail && (
              <div className="flex justify-between">
                <dt className="text-muted">Ownership email</dt>
                <dd className="text-xs">{escrow.ownershipEmail}</dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      {escrow.dispute && (
        <Card>
          <h2 className="mb-3 font-semibold text-danger">Dispute</h2>
          <p className="text-sm">{escrow.dispute.reason}</p>
          {escrow.dispute.evidence.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Evidence submitted</p>
              {escrow.dispute.evidence.map((e) => (
                <div key={e.id} className="rounded-lg border border-surface-border bg-surface p-3 text-sm">
                  <p className="text-xs text-muted mb-1">User {e.userId} · {formatDate(e.submittedAt)}</p>
                  <p>{e.statement}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card>
        <h2 className="mb-1 font-semibold">Order duration</h2>
        <p className="mb-3 text-sm text-muted">
          {escrow.countdownEndsAt
            ? "The transfer is already in progress — this adjusts the live transfer countdown."
            : "Manage the completion countdown for this order."}
        </p>
        <EscrowDurationControl
          escrowId={escrow.id}
          currentDeadline={(escrow.countdownEndsAt ?? escrow.transferDeadline)?.toISOString() ?? null}
        />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Admin actions</h2>
        <EscrowActions
          escrowId={escrow.id}
          status={escrow.status}
          isBuyer={false}
          isSeller={false}
          isAdmin={true}
          credentials={credentials}
          isHighValue={escrow.isHighValue}
          videoVerificationRequired={escrow.videoVerificationRequired}
          videoVerificationCompletedAt={escrow.videoVerificationCompletedAt}
          transferModel={escrow.transferModel}
          managerEmail={escrow.managerEmail}
          countdownEndsAt={escrow.countdownEndsAt}
          sellerConfirmedHandoverAt={escrow.sellerConfirmedHandoverAt}
        />
      </Card>

      <EscrowChat escrowId={escrow.id} />
    </div>
  );
}
