import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Hourglass, Star } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { LISTING_STATUS_STYLE, PLATFORM_LABEL } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TABS = ["overview", "ownership", "escrows", "reviews", "reports"] as const;
type Tab = (typeof TABS)[number];

// Platforms where admin must manually verify the AM- code in the bio
const MANUAL_VERIFY_PLATFORMS = new Set([
  "INSTAGRAM", "TIKTOK", "TWITTER_X", "FACEBOOK",
  "SNAPCHAT", "PINTEREST", "LINKEDIN", "WEBSITE",
]);

function profileUrl(platform: string, accountUrl: string): string {
  return accountUrl;
}

export default async function AdminListingDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const session = await requireAdmin("MANAGE_LISTINGS");
  if (!session) redirect("/admin?denied=1");

  const tab = (TABS.includes(searchParams.tab as Tab) ? searchParams.tab : "overview") as Tab;

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: {
      seller: {
        select: {
          id: true, username: true, email: true, name: true,
          kycLevel: true, trustScore: true, verifiedBadge: true, createdAt: true,
        },
      },
      escrows: {
        include: {
          buyer: { select: { username: true, email: true } },
          dispute: { select: { id: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      watchlist: { select: { id: true } },
    },
  });
  if (!listing) notFound();

  const reports = await prisma.report.findMany({
    where: { targetType: "LISTING", targetId: listing.id },
    include: { reporter: { select: { username: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const reviews = await prisma.review.findMany({
    where: { escrowId: { in: listing.escrows.map((e) => e.id) } },
    include: { reviewer: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Count other listings by same seller for context
  const sellerListingCount = await prisma.listing.count({
    where: { sellerId: listing.sellerId },
  });

  const style = LISTING_STATUS_STYLE[listing.status];
  const screenshots = Array.isArray(listing.screenshots) ? (listing.screenshots as string[]) : [];
  const needsManualOwnership = MANUAL_VERIFY_PLATFORMS.has(listing.platform) && !listing.ownershipVerified;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/listings" className="mb-1 inline-flex items-center gap-1.5 text-sm text-brand-500 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            All listings
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">{listing.title}</h1>
            <StatusPill label={style.label} className={style.className} />
            {listing.ownershipVerified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                Ownership
                <Check className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">verified</span>
              </span>
            ) : (
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning-foreground">
                Ownership pending
              </span>
            )}
            {needsManualOwnership && (
              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger animate-pulse">
                Needs manual check
              </span>
            )}
          </div>
          <p className="text-sm text-muted">
            {PLATFORM_LABEL[listing.platform]} · {formatCurrency(listing.price.toString())} · by{" "}
            <Link href={`/admin/users/${listing.seller.id}`} className="hover:underline text-brand-500">
              {listing.seller.username ?? listing.seller.email}
            </Link>{" "}
            · {formatDate(listing.createdAt)}
          </p>
        </div>
        <AdminActionButtons
          endpoint={`/api/admin/listings/${listing.id}`}
          actions={
            listing.status === "PENDING"
              ? [
                  { label: "Approve", action: "approve", variant: "primary" },
                  { label: "Reject", action: "reject", variant: "danger", promptReason: true },
                ]
              : listing.status === "ACTIVE"
                ? [{ label: "Suspend", action: "suspend", variant: "danger", promptReason: true, confirm: "Suspend this listing?" }]
                : listing.status === "SUSPENDED"
                  ? [{ label: "Re-activate", action: "reactivate", variant: "primary" }]
                  : []
          }
        />
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-surface p-1 w-fit">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/listings/${listing.id}?tab=${t}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition",
              t === tab ? "bg-brand-500 text-white" : "text-muted hover:text-foreground",
            )}
          >
            {t}
            {t === "ownership" && needsManualOwnership && (
              <span className="ml-1 inline-block h-2 w-2 rounded-full bg-danger" />
            )}
          </Link>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Account details */}
          <Card>
            <h2 className="mb-3 font-semibold">Account details</h2>
            <dl className="flex flex-col gap-2 text-sm">
              {[
                ["Platform", PLATFORM_LABEL[listing.platform]],
                ["Followers", listing.followers ? listing.followers.toLocaleString() : "—"],
                ["Engagement rate", listing.engagementRate ? `${listing.engagementRate}%` : "—"],
                ["Account age", listing.accountAgeMonths ? `${listing.accountAgeMonths} months` : "—"],
                ["Monetized", listing.monetized ? "Yes" : "No"],
                ...(listing.lifetimeViews != null ? [["Lifetime views", listing.lifetimeViews.toLocaleString()]] : []),
                ...(listing.lifetimeRevenue != null ? [["Lifetime revenue", `$${Number(listing.lifetimeRevenue).toLocaleString()}`]] : []),
                ...(listing.channelRpm != null ? [["RPM", `$${Number(listing.channelRpm).toFixed(2)}`]] : []),
                ...(listing.audienceLanguage ? [["Audience language", listing.audienceLanguage]] : []),
                ...(listing.adsenseStatus ? [["AdSense", listing.adsenseStatus]] : []),
                ...(listing.strikeCount > 0 || listing.warningCount > 0
                  ? [["Strikes / Warnings", `${listing.strikeCount} strike(s), ${listing.warningCount} warning(s)`]]
                  : [["Standing", "Good Standing"]]),
                ["Price", formatCurrency(listing.price.toString())],
                ["Views", listing.viewCount.toLocaleString()],
                ["Saved by", `${listing.watchlist.length} users`],
                ["Mod score", String(listing.moderationScore)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 border-b border-surface-border pb-1 last:border-0 last:pb-0">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Seller info */}
          <Card>
            <h2 className="mb-3 font-semibold">Seller</h2>
            <dl className="flex flex-col gap-2 text-sm">
              {[
                ["Username", listing.seller.username ?? "—"],
                ["Email", listing.seller.email],
                ["KYC level", listing.seller.kycLevel],
                ["Trust score", String(listing.seller.trustScore)],
                ["Verified badge", listing.seller.verifiedBadge ? "Yes" : "No"],
                ["Member since", formatDate(listing.seller.createdAt)],
                ["Total listings", String(sellerListingCount)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 border-b border-surface-border pb-1 last:border-0 last:pb-0">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <Link
              href={`/admin/users/${listing.seller.id}`}
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand-500 hover:underline"
            >
              View seller profile
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Card>

          {/* Account URL */}
          <Card className="sm:col-span-2">
            <h2 className="mb-2 font-semibold">Account URL</h2>
            <a
              href={listing.accountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-500/10 px-4 py-3 text-sm font-medium text-brand-700 dark:text-brand-400 hover:bg-brand-100 break-all"
            >
              {listing.accountUrl}
              <span className="inline-flex shrink-0 items-center gap-1.5">
                <ExternalLink className="h-4 w-4" aria-hidden />
                Open
              </span>
            </a>
          </Card>

          {/* Description */}
          <Card className="sm:col-span-2">
            <h2 className="mb-3 font-semibold">Description</h2>
            <p className="text-sm whitespace-pre-wrap">{listing.description}</p>
            {listing.rejectionReason && (
              <div className="mt-3 rounded-xl bg-danger/5 border border-danger/20 p-3">
                <p className="text-xs font-medium text-danger">Rejection reason</p>
                <p className="mt-1 text-sm">{listing.rejectionReason}</p>
              </div>
            )}
          </Card>

          {/* Screenshots */}
          {screenshots.length > 0 && (
            <Card className="sm:col-span-2">
              <h2 className="mb-3 font-semibold">Screenshots ({screenshots.length})</h2>
              <div className="flex flex-wrap gap-3">
                {screenshots.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`screenshot ${i + 1}`}
                      className="h-32 w-32 rounded-xl object-cover border border-surface-border hover:opacity-80 transition"
                    />
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── OWNERSHIP ── */}
      {tab === "ownership" && (
        <div className="flex flex-col gap-4">
          {/* Status card */}
          <Card className={cn(
            "border-2",
            listing.ownershipVerified ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5",
          )}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-1.5 font-semibold">
                  {listing.ownershipVerified ? (
                    <Check className="h-4 w-4 text-success" aria-hidden />
                  ) : (
                    <Hourglass className="h-4 w-4 text-warning" aria-hidden />
                  )}
                  {listing.ownershipVerified ? "Ownership verified" : "Ownership not verified"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {listing.ownershipVerified
                    ? `Method: ${listing.ownershipMethod ?? "unknown"} · Verified ${listing.ownershipVerifiedAt ? formatDate(listing.ownershipVerifiedAt) : "—"}`
                    : MANUAL_VERIFY_PLATFORMS.has(listing.platform)
                      ? "This platform requires manual review — check the account bio for the verification code below."
                      : "Automatic verification was not completed."}
                </p>
              </div>
              {listing.ownershipVerified && (
                <span className="rounded-full bg-success/15 px-3 py-1 text-sm font-medium text-success">
                  Auto-verified
                </span>
              )}
            </div>
          </Card>

          {/* Verification code */}
          <Card>
            <h2 className="mb-3 font-semibold">Verification code</h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-xl border border-dashed border-brand-300 bg-brand-500/10 px-4 py-2 font-mono text-lg font-bold text-brand-700">
                {listing.ownershipVerificationCode ?? "—"}
              </span>
              <p className="text-sm text-muted">
                The seller was asked to add this code to their account bio/description.
              </p>
            </div>
          </Card>

          {/* Account link for manual check */}
          <Card>
            <h2 className="mb-3 font-semibold">Account to verify</h2>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted">Platform:</span>
                <span className="font-medium">{PLATFORM_LABEL[listing.platform]}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted">Account URL:</span>
                <a
                  href={listing.accountUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-700 dark:text-brand-400 hover:bg-brand-100 break-all"
                >
                  {listing.accountUrl}
                  <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                </a>
              </div>
              {listing.verifiedPlatformId && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-muted">Platform ID (confirmed):</span>
                  <span className="font-mono text-sm font-medium">{listing.verifiedPlatformId}</span>
                </div>
              )}
            </div>

            {/* Instructions per platform */}
            {MANUAL_VERIFY_PLATFORMS.has(listing.platform) && !listing.ownershipVerified && (
              <div className="mt-4 rounded-xl bg-surface p-4 text-sm">
                <p className="font-medium mb-2">Manual review steps:</p>
                <ol className="flex flex-col gap-1.5 list-decimal list-inside text-muted">
                  <li>Click the account URL above to open the profile in a new tab.</li>
                  <li>
                    Find the bio / About / description section of the account.
                  </li>
                  <li>
                    Confirm the code{" "}
                    <span className="font-mono font-bold text-brand-700">
                      {listing.ownershipVerificationCode ?? "—"}
                    </span>{" "}
                    is visible in that section.
                  </li>
                  <li>If the code is present → <strong>Approve</strong> the listing.</li>
                  <li>If the code is missing or the account doesn&apos;t match → <strong>Reject</strong> with a reason.</li>
                </ol>
              </div>
            )}
          </Card>

          {/* Action buttons repeated here for convenience */}
          {listing.status === "PENDING" && (
            <Card>
              <h2 className="mb-3 font-semibold">Decision</h2>
              <p className="mb-3 text-sm text-muted">
                Once you have verified ownership, approve or reject the listing.
              </p>
              <AdminActionButtons
                endpoint={`/api/admin/listings/${listing.id}`}
                actions={[
                  { label: "Approve listing", action: "approve", variant: "primary" },
                  { label: "Reject — ownership not verified", action: "reject", variant: "danger", promptReason: true },
                ]}
              />
            </Card>
          )}
        </div>
      )}

      {/* ── ESCROWS ── */}
      {tab === "escrows" && (
        <div className="flex flex-col gap-2">
          {listing.escrows.map((e) => (
            <Card key={e.id} className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/escrows/${e.id}`} className="text-sm font-medium hover:underline text-brand-500">
                    Escrow {e.id.slice(-8)}
                  </Link>
                  <StatusPill label={e.status} className="bg-surface text-muted" />
                  {e.dispute && (
                    <StatusPill label={`Dispute: ${e.dispute.status}`} className="bg-danger/10 text-danger" />
                  )}
                </div>
                <p className="text-xs text-muted">
                  Buyer: {e.buyer.username ?? e.buyer.email} · {formatCurrency(e.amount.toString())} · {formatDate(e.createdAt)}
                </p>
              </div>
            </Card>
          ))}
          {listing.escrows.length === 0 && <p className="text-sm text-muted">No escrows yet.</p>}
        </div>
      )}

      {/* ── REVIEWS ── */}
      {tab === "reviews" && (
        <div className="flex flex-col gap-2">
          {reviews.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-0.5 text-warning" role="img" aria-label={`${r.rating} out of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={cn("h-3.5 w-3.5", n <= r.rating ? "fill-current" : "text-surface-border")}
                      aria-hidden
                    />
                  ))}
                </span>
                <span className="text-sm text-muted">
                  by {r.reviewer.username ?? "user"} · {formatDate(r.createdAt)}
                </span>
              </div>
              {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
            </Card>
          ))}
          {reviews.length === 0 && <p className="text-sm text-muted">No reviews yet.</p>}
        </div>
      )}

      {/* ── REPORTS ── */}
      {tab === "reports" && (
        <div className="flex flex-col gap-2">
          {reports.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-sm font-medium">{r.reason}</span>
                  <p className="text-xs text-muted">
                    by {r.reporter.username ?? r.reporter.email} · {r.status} · {formatDate(r.createdAt)}
                  </p>
                  {r.details && <p className="mt-1 text-xs">{r.details}</p>}
                </div>
                <StatusPill label={r.status} className="bg-surface text-muted shrink-0" />
              </div>
            </Card>
          ))}
          {reports.length === 0 && <p className="text-sm text-muted">No reports.</p>}
        </div>
      )}
    </div>
  );
}
