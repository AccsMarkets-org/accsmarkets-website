import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, ExternalLink, X } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDate } from "@/lib/utils";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { decryptKycField, isEncryptedKycField } from "@/lib/kyc-encrypt";
import { resignKycUrl } from "@/lib/cloudinary";
import { isVisionAvailable } from "@/lib/ai";

// Rows written before KYC-at-rest encryption hold plain URLs; newer rows hold iv:tag:ct.
function readKycField(value: string | null): string | null {
  if (!value) return null;
  if (!isEncryptedKycField(value)) return value;
  try {
    return decryptKycField(value);
  } catch {
    return null;
  }
}

// Document images live as authenticated Cloudinary assets behind 24h signed
// links; re-sign at render time so an old submission still opens.
function readKycUrl(value: string | null): string | null {
  const url = readKycField(value);
  return url ? resignKycUrl(url) : null;
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  PENDING:      { label: "Pending",      className: "bg-warning/10 text-warning" },
  UNDER_REVIEW: { label: "Under Review", className: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400" },
  APPROVED:     { label: "Approved",     className: "bg-success/10 text-success" },
  REJECTED:     { label: "Rejected",     className: "bg-danger/10 text-danger" },
  SUBMITTED:    { label: "Submitted",    className: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400" },
};

export default async function AdminVerificationPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const session = await requireAdmin("MANAGE_KYC");
  if (!session) redirect("/admin?denied=1");

  const tab = searchParams.tab ?? "kyc";

  const [kycSubmissions, kybSubmissions, kycCount, kybCount] = await Promise.all([
    tab === "kyc"
      ? prisma.kycSubmission.findMany({
          where: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
          include: { user: { select: { id: true, username: true, email: true } } },
          orderBy: { createdAt: "asc" },
          take: 100,
        })
      : Promise.resolve([]),
    tab === "kyb"
      ? prisma.kybSubmission.findMany({
          where: { status: "SUBMITTED" },
          include: {
            org: { select: { id: true, name: true, owner: { select: { email: true, username: true } } } },
          },
          orderBy: { createdAt: "asc" },
          take: 100,
        })
      : Promise.resolve([]),
    prisma.kycSubmission.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
    prisma.kybSubmission.count({ where: { status: "SUBMITTED" } }),
  ]);

  const totalPending = kycCount + kybCount;
  const aiEnabled = isVisionAvailable();

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        title="Verification Queue"
        badge={totalPending}
        badgeUrgent={totalPending > 0}
        subtitle="KYC and KYB review queue"
      />

      {/* Tab bar */}
      <div className="flex gap-1.5">
        {[
          { key: "kyc", label: "KYC (Users)", count: kycCount },
          { key: "kyb", label: "KYB (Organizations)", count: kybCount },
        ].map(({ key, label, count }) => (
          <Link
            key={key}
            href={`/admin/verification?tab=${key}`}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === key ? "bg-brand-500 text-white" : "border border-surface-border bg-surface text-muted hover:text-foreground hover:border-brand-300"
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                tab === key ? "bg-white/20 text-white" : "bg-warning text-white"
              }`}>
                {count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {tab === "kyc" && (
        <div className="flex flex-col gap-3">
          {kycSubmissions.map((s) => {
            const style = STATUS_STYLE[s.status] ?? STATUS_STYLE.PENDING;
            return (
              <div key={s.id} className="rounded-2xl border border-surface-border bg-surface p-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <Link href={`/admin/users/${s.user.id}`} className="font-semibold hover:text-brand-600 transition">
                      {s.user.username ?? s.user.email}
                    </Link>
                    <p className="text-xs text-muted mt-0.5">Submitted {formatDate(s.createdAt)}</p>
                  </div>
                  <StatusPill label={style.label} className={style.className} />
                </div>

                {/* AI pre-check (phase 1: OCR + quality + tamper hints — no face match / liveness yet) */}
                {s.kycScore === null ? (
                  <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-surface-border px-3 py-1.5 text-xs text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-surface-border" aria-hidden />
                    {aiEnabled ? "AI check not run yet" : "AI check not run (no vision provider configured)"}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-muted mb-1">
                        AI Score
                        {s.kycScore >= 80 && <span className="ml-1.5 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">AI: looks good</span>}
                        {s.kycScore < 30 && <span className="ml-1.5 rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold text-danger">Needs attention</span>}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-surface-border overflow-hidden">
                          <div
                            className={`h-full rounded-full ${s.kycScore >= 70 ? "bg-success" : s.kycScore >= 40 ? "bg-warning" : "bg-danger"}`}
                            style={{ width: `${Math.round(s.kycScore)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold w-8">{Math.round(s.kycScore)}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Face Similarity</p>
                      {s.faceSimilarity === null ? (
                        <span className="text-xs text-muted">Not checked (manual compare)</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-surface-border overflow-hidden">
                            <div
                              className={`h-full rounded-full ${s.faceSimilarity >= 70 ? "bg-success" : s.faceSimilarity >= 40 ? "bg-warning" : "bg-danger"}`}
                              style={{ width: `${Math.round(s.faceSimilarity)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold w-8">{Math.round(s.faceSimilarity)}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Liveness</p>
                      {s.isLive === null ? (
                        <span className="text-xs text-muted">Not checked</span>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold ${s.isLive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                          {s.isLive ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
                          {s.isLive ? "Live" : "Not live"}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* OCR data */}
                {(s.ocrName || s.ocrDob || s.ocrDocNumber || s.ocrExpiry) && (
                  <div className="rounded-xl bg-surface-muted border border-surface-border px-3 py-2 mb-3 text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
                    {s.ocrName && <span><span className="font-medium text-foreground">Name:</span> {readKycField(s.ocrName)}</span>}
                    {s.ocrDob && <span><span className="font-medium text-foreground">DOB:</span> {readKycField(s.ocrDob)}</span>}
                    {s.ocrDocNumber && <span><span className="font-medium text-foreground">Doc #:</span> {readKycField(s.ocrDocNumber)}</span>}
                    {s.ocrExpiry && <span><span className="font-medium text-foreground">Expires:</span> {readKycField(s.ocrExpiry)}</span>}
                    <span className="text-[10px] italic">OCR by AI — verify against the document image</span>
                  </div>
                )}

                {/* Document thumbnails */}
                <div className="flex flex-wrap gap-3 mb-3">
                  {([["ID Front", readKycUrl(s.idFrontUrl)], ["ID Back", readKycUrl(s.idBackUrl)], ["Selfie", readKycUrl(s.selfieUrl)]] as const).map(([label, url]) => (
                    url && (
                      <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={label} className="h-20 w-28 rounded-xl object-cover border border-surface-border group-hover:border-brand-300 transition" />
                        <span className="inline-flex items-center justify-center gap-1 text-[10px] text-center text-muted">{label}<ExternalLink className="h-3 w-3" aria-hidden /></span>
                      </a>
                    )
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <AdminActionButtons
                    endpoint={`/api/admin/verification/${s.id}`}
                    actions={[
                      { label: "Approve", action: "approve", variant: "primary" as const, method: "PATCH" as const },
                      { label: "Reject", action: "reject", variant: "danger" as const, promptReason: true, method: "PATCH" as const },
                    ]}
                  />
                  {aiEnabled && (
                    <AdminActionButtons
                      endpoint={`/api/admin/verification/${s.id}/rerun-ai`}
                      actions={[
                        { label: s.kycScore === null ? "Run AI check" : "Re-run AI check", action: "rerun_ai", variant: "outline" as const, method: "PATCH" as const },
                      ]}
                    />
                  )}
                </div>
              </div>
            );
          })}
          {kycSubmissions.length === 0 && <div className="py-16 text-center text-muted">No pending KYC submissions.</div>}
        </div>
      )}

      {tab === "kyb" && (
        <div className="flex flex-col gap-3">
          {kybSubmissions.map((s) => {
            const style = STATUS_STYLE[s.status] ?? STATUS_STYLE.SUBMITTED;
            return (
              <div key={s.id} className="rounded-2xl border border-surface-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold">{s.businessName}</p>
                    <p className="text-xs text-muted mt-0.5">
                      Org: {s.org.name} · Owner: {s.org.owner.username ?? s.org.owner.email}
                    </p>
                    <p className="text-xs text-muted">
                      {s.country && <CountryFlag code={s.country} />} {s.country}
                      {" · "}Submitted {formatDate(s.createdAt)}
                    </p>
                  </div>
                  <StatusPill label={style.label} className={style.className} />
                </div>

                {/* Beneficial owners */}
                {Array.isArray(s.beneficialOwners) && s.beneficialOwners.length > 0 && (
                  <div className="rounded-xl bg-surface-muted border border-surface-border px-3 py-2 mb-3">
                    <p className="text-xs font-medium text-foreground mb-1">Beneficial owners</p>
                    <div className="flex flex-wrap gap-2">
                      {(s.beneficialOwners as { name: string; ownershipPct: number }[]).map((o, i) => (
                        <span key={i} className="rounded-lg bg-brand-500/10 px-2 py-1 text-xs">
                          {o.name} <span className="font-bold text-brand-700">{o.ownershipPct}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document links */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {s.regDocUrl && (
                    <a href={s.regDocUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border px-3 py-1.5 text-xs hover:border-brand-300 transition">
                      Registration doc
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  )}
                  {s.utilityBillUrl && (
                    <a href={s.utilityBillUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border px-3 py-1.5 text-xs hover:border-brand-300 transition">
                      Utility bill
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  )}
                </div>

                <AdminActionButtons
                  endpoint={`/api/admin/kyb/${s.id}`}
                  actions={[
                    { label: "Approve", action: "approve", variant: "primary" as const, method: "PUT" as const },
                    { label: "Request info", action: "request_info", variant: "outline" as const, promptReason: true, method: "PUT" as const },
                    { label: "Reject", action: "reject", variant: "danger" as const, promptReason: true, method: "PUT" as const },
                  ]}
                />
              </div>
            );
          })}
          {kybSubmissions.length === 0 && <div className="py-16 text-center text-muted">No pending KYB submissions.</div>}
        </div>
      )}
    </div>
  );
}
