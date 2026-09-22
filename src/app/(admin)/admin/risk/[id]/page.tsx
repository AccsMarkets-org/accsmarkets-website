import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { Card } from "@/components/ui/Card";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { RiskFactor } from "@/lib/risk";
import { FlagActions, RiskCaseActions } from "./RiskCaseActions";

export const dynamic = "force-dynamic";

const SEVERITY_STYLE: Record<string, string> = {
  LOW: "bg-success/10 text-success",
  MEDIUM: "bg-warning/10 text-warning",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  CRITICAL: "bg-danger/10 text-danger",
};

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.LOW)}>
      {severity}
    </span>
  );
}

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 font-bold text-foreground">
      {children}
      {count != null && <span className="rounded-full bg-surface-border px-2 py-0.5 text-xs font-semibold text-muted">{count}</span>}
    </h2>
  );
}

export default async function AdminRiskCasePage({ params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) redirect("/admin");

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, username: true, email: true, role: true, kycLevel: true,
      isBanned: true, bannedReason: true, createdAt: true, lastSeenAt: true, walletBalance: true, trustScore: true,
    },
  });
  if (!user) notFound();

  const [riskScore, flags, fingerprints, loginAttempts, activeSessions, withdrawals] = await Promise.all([
    prisma.riskScore.findUnique({ where: { userId: user.id } }),
    prisma.securityFlag.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.deviceFingerprint.findMany({ where: { userId: user.id }, orderBy: { lastSeenAt: "desc" } }),
    prisma.loginAttempt.findMany({ where: { email: user.email }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.activeSession.findMany({ where: { userId: user.id }, orderBy: { lastSeenAt: "desc" }, take: 20 }),
    prisma.transaction.findMany({
      where: { userId: user.id, type: "WITHDRAWAL" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // Other accounts seen on each of this user's devices.
  const sharedByHash = new Map<string, { id: string; email: string; username: string | null }[]>();
  if (fingerprints.length > 0) {
    const shared = await prisma.deviceFingerprint.findMany({
      where: { fingerprintHash: { in: fingerprints.map((f) => f.fingerprintHash) }, userId: { not: user.id } },
      select: { fingerprintHash: true, user: { select: { id: true, email: true, username: true } } },
    });
    for (const s of shared) {
      const list = sharedByHash.get(s.fingerprintHash) ?? [];
      list.push(s.user);
      sharedByHash.set(s.fingerprintHash, list);
    }
  }

  const factors = ((riskScore?.factors as RiskFactor[] | null) ?? []).filter((f) => f && typeof f === "object");
  const openFlags = flags.filter((f) => !f.resolvedAt);
  const resolvedFlags = flags.filter((f) => f.resolvedAt);
  const displayName = user.name ?? user.username ?? user.email;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <Link href="/admin/risk" className="inline-flex items-center gap-1.5 text-sm text-brand-500 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Risk management
      </Link>

      <AdminPageHeader
        title={`Risk case: ${displayName}`}
        subtitle={`${user.email} · Joined ${formatDate(user.createdAt)} · Last seen ${user.lastSeenAt ? formatDate(user.lastSeenAt) : "never"}`}
        badge={openFlags.length}
        badgeUrgent
        actions={
          <>
            <RiskCaseActions userId={user.id} />
            <Link
              href={`/admin/users/${user.id}`}
              className="rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-brand-200"
            >
              {user.isBanned ? "View user (banned)" : "User profile / Ban"}
            </Link>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* User summary */}
        <Card>
          <SectionTitle>User</SectionTitle>
          <dl className="flex flex-col gap-2 text-sm">
            {[
              ["ID", user.id],
              ["Username", user.username ?? "—"],
              ["Role", user.role],
              ["KYC level", user.kycLevel],
              ["Wallet", formatCurrency(user.walletBalance.toString())],
              ["Trust score", String(user.trustScore)],
              ["Banned", user.isBanned ? `Yes — ${user.bannedReason ?? "no reason"}` : "No"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="shrink-0 text-muted">{k}</dt>
                <dd className="max-w-[60%] break-all text-right font-medium text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* Risk score */}
        <Card>
          <SectionTitle>Risk score</SectionTitle>
          {!riskScore ? (
            <p className="text-sm text-muted">No score computed yet. Use &ldquo;Recompute score&rdquo;.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="text-3xl font-black text-foreground">{riskScore.score}</span>
                <SeverityBadge severity={riskScore.severity} />
                <span className="text-xs text-muted">Computed {formatDate(riskScore.computedAt)}</span>
                {riskScore.dismissedAt && (
                  <span className="text-xs text-muted">· Dismissed {formatDate(riskScore.dismissedAt)}</span>
                )}
              </div>
              {factors.length === 0 ? (
                <p className="text-sm text-muted">No risk factors.</p>
              ) : (
                <ul className="space-y-2">
                  {factors.map((f) => (
                    <li key={f.key} className="flex items-start gap-3">
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", f.weight >= 35 ? "bg-danger" : f.weight >= 25 ? "bg-warning" : "bg-info")} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{f.label} <span className="text-xs text-muted">· weight {f.weight}</span></p>
                        {f.detail && <p className="text-xs text-muted">{f.detail}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Card>

        {/* Security flags */}
        <Card className="lg:col-span-2">
          <SectionTitle count={openFlags.length}>Open security flags</SectionTitle>
          {openFlags.length === 0 ? (
            <p className="text-sm text-muted">No open flags.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {openFlags.map((f) => (
                <div key={f.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-surface-border bg-background px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={f.severity} />
                      <span className="font-mono text-xs text-muted">{f.source}</span>
                      <span className="text-xs text-muted">{formatDate(f.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-foreground">{f.reason}</p>
                  </div>
                  <FlagActions userId={user.id} flagId={f.id} />
                </div>
              ))}
            </div>
          )}

          {resolvedFlags.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-muted hover:text-foreground">
                Resolved flags ({resolvedFlags.length})
              </summary>
              <div className="mt-2 flex flex-col gap-2">
                {resolvedFlags.map((f) => (
                  <div key={f.id} className="rounded-xl border border-surface-border bg-background px-4 py-3 opacity-70">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={f.severity} />
                      <span className="font-mono text-xs text-muted">{f.source}</span>
                      <span className="text-xs text-muted">Opened {formatDate(f.createdAt)} · Closed {f.resolvedAt ? formatDate(f.resolvedAt) : "—"}</span>
                    </div>
                    <p className="mt-1 text-sm text-foreground">{f.reason}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </Card>

        {/* Device fingerprints */}
        <Card>
          <SectionTitle count={fingerprints.length}>Device fingerprints</SectionTitle>
          {fingerprints.length === 0 ? (
            <p className="text-sm text-muted">No devices recorded yet (recorded on next login).</p>
          ) : (
            <div className="flex flex-col gap-2">
              {fingerprints.map((fp) => {
                const others = sharedByHash.get(fp.fingerprintHash) ?? [];
                return (
                  <div key={fp.id} className="rounded-xl border border-surface-border bg-background px-4 py-3">
                    <p className="font-mono text-xs text-foreground break-all">{fp.fingerprintHash.slice(0, 16)}…{fp.fingerprintHash.slice(-8)}</p>
                    <p className="text-xs text-muted">First seen {formatDate(fp.firstSeenAt)} · Last seen {formatDate(fp.lastSeenAt)}</p>
                    {others.length > 0 ? (
                      <div className="mt-1.5">
                        <p className="text-xs font-semibold text-danger">Also seen on {others.length} other account{others.length === 1 ? "" : "s"}:</p>
                        <ul className="mt-1 flex flex-wrap gap-1.5">
                          {others.map((o) => (
                            <li key={o.id}>
                              <Link href={`/admin/risk/${o.id}`} className="rounded-full border border-danger/30 bg-danger/5 px-2 py-0.5 text-xs text-danger hover:underline">
                                {o.username ?? o.email}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-success">Not seen on any other account</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Active sessions */}
        <Card>
          <SectionTitle count={activeSessions.length}>Active sessions</SectionTitle>
          {activeSessions.length === 0 ? (
            <p className="text-sm text-muted">No sessions recorded.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {activeSessions.map((s) => (
                <div key={s.id} className="rounded-xl border border-surface-border bg-background px-4 py-2.5">
                  <p className="text-sm text-foreground">{s.ip ?? "unknown IP"} <span className="text-xs text-muted">· last seen {formatDate(s.lastSeenAt)}</span></p>
                  <p className="truncate text-xs text-muted" title={s.userAgent ?? ""}>{s.userAgent ?? "unknown user-agent"}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Login attempts */}
        <Card>
          <SectionTitle count={loginAttempts.length}>Recent login attempts</SectionTitle>
          {loginAttempts.length === 0 ? (
            <p className="text-sm text-muted">No login attempts recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-widest text-muted">
                    <th className="py-2 pr-3">IP</th>
                    <th className="py-2 pr-3">Result</th>
                    <th className="py-2">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {loginAttempts.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 pr-3 font-mono text-xs text-foreground">{a.ip}</td>
                      <td className="py-2 pr-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", a.success ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                          {a.success ? "Success" : "Failed"}
                        </span>
                      </td>
                      <td className="py-2 text-xs text-muted">{formatDate(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Withdrawals */}
        <Card>
          <SectionTitle count={withdrawals.length}>Recent withdrawals</SectionTitle>
          {withdrawals.length === 0 ? (
            <p className="text-sm text-muted">No withdrawals.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {withdrawals.map((w) => {
                const meta = (w.metadata ?? {}) as { method?: string; riskHold?: boolean; riskLevel?: string };
                return (
                  <div key={w.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-border bg-background px-4 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(w.amount.toString())} <span className="text-xs font-normal text-muted">· {meta.method ?? "—"}</span></p>
                      <p className="text-xs text-muted">{formatDate(w.createdAt)} · {w.id.slice(-8)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {meta.riskHold && (
                        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">Risk hold{meta.riskLevel ? ` · ${meta.riskLevel}` : ""}</span>
                      )}
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", w.status === "PENDING" ? "bg-warning/10 text-warning" : w.status === "COMPLETED" ? "bg-success/10 text-success" : "bg-muted/10 text-muted")}>
                        {w.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
