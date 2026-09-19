"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useConfirm } from "@/hooks/useConfirm";
import { cn } from "@/lib/utils";
import type { EscrowStatus, TransferModel } from "@prisma/client";

interface EscrowActionsProps {
  escrowId: string;
  status: EscrowStatus;
  isBuyer: boolean;
  isSeller: boolean;
  isAdmin?: boolean;
  credentials: string | null;
  isHighValue?: boolean;
  videoVerificationRequired?: boolean;
  videoVerificationCompletedAt?: Date | string | null;
  transferModel?: TransferModel | null;
  managerEmail?: { address: string } | null;
  countdownEndsAt?: Date | string | null;
  sellerConfirmedHandoverAt?: Date | string | null;
}

export function EscrowActions({
  escrowId,
  status,
  isBuyer,
  isSeller,
  isAdmin = false,
  credentials,
  isHighValue = false,
  videoVerificationRequired = false,
  videoVerificationCompletedAt = null,
  transferModel = null,
  managerEmail = null,
  countdownEndsAt = null,
  sellerConfirmedHandoverAt = null,
}: EscrowActionsProps) {
  const router = useRouter();
  const [credentialsInput, setCredentialsInput] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [poolEmail, setPoolEmail] = useState<{ id: string; address: string } | null>(
    managerEmail ? { id: "", address: managerEmail.address } : null,
  );
  const [rejectNotes, setRejectNotes] = useState("");
  const [countdownElapsed, setCountdownElapsed] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerDays, setTimerDays] = useState("7");
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    if (!countdownEndsAt) return;
    const end = new Date(countdownEndsAt).getTime();
    function check() {
      setCountdownElapsed(Date.now() >= end);
    }
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [countdownEndsAt]);

  async function call(path: string, body?: unknown, successMsg?: string) {
    setLoading(path);
    try {
      const res = await fetch(`/api/escrows/${escrowId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      if (successMsg) toast.success(successMsg);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  async function callAdmin(path: string, body?: unknown, successMsg?: string) {
    setLoading(path);
    try {
      const res = await fetch(`/api/admin/escrows/${escrowId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      if (successMsg) toast.success(successMsg);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  async function loadPoolEmail() {
    if (poolEmail?.address) return;
    setLoading("load-email");
    try {
      const res = await fetch(`/api/escrows/${escrowId}/manager-email`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load email");
      setPoolEmail(data.email);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load escrow email");
    } finally {
      setLoading(null);
    }
  }

  const adminSuffix = isAdmin && !isBuyer && !isSeller ? " (as admin)" : "";
  const videoVerified = Boolean(videoVerificationCompletedAt);
  const videoBlockingVerify = videoVerificationRequired && !videoVerified;

  const countdownLabel = countdownEndsAt
    ? (() => {
        const ms = new Date(countdownEndsAt).getTime() - Date.now();
        if (ms <= 0) return "Countdown complete";
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return days > 0 ? `${days}d ${hours}h remaining` : `${hours}h remaining`;
      })()
    : null;

  return (
    <>
      {ConfirmDialog}
      <div className="flex flex-col gap-3">

        {/* Admin badge */}
        {isAdmin && !isBuyer && !isSeller && (
          <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd"/>
            </svg>
            <span className="font-medium">Acting as admin on this escrow</span>
          </div>
        )}

        {/* High-value badge */}
        {isHighValue && (
          <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <span><strong>High-value escrow</strong> — a verification call is required before funds can be released.</span>
          </div>
        )}

        {/* Video verification panel */}
        {videoVerificationRequired && ["FUNDED", "AWAITING_MANAGER_ADD", "PENDING_VERIFICATION", "SUBMITTED", "VERIFIED"].includes(status) && (
          <div className={cn(
            "overflow-hidden rounded-xl border p-3",
            videoVerified ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5",
          )}>
            <div className="flex items-center gap-2 mb-1">
              <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs", videoVerified ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>
                {videoVerified ? "✓" : "!"}
              </div>
              <p className={cn("text-sm font-bold", videoVerified ? "text-success" : "text-warning")}>
                {videoVerified ? "Verification call completed" : "Verification call required"}
              </p>
            </div>
            {!videoVerified && (
              <>
                <p className="mb-3 text-xs text-muted">Schedule a short video call with our support team to confirm the transfer.</p>
                {(isBuyer || isAdmin) && (
                  <Button size="sm" isLoading={loading === "video-verification"} onClick={() => call("video-verification", {}, "Verification call logged")}>
                    Log verification call complete
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── AWAITING_MANAGER_ADD ── */}
        {status === "AWAITING_MANAGER_ADD" && (
          <>
            {isSeller && (
              <div className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white dark:border-violet-800 dark:from-violet-950/30 dark:to-background">
                <div className="flex items-center gap-2 border-b border-violet-100 bg-violet-50 px-4 py-2.5 dark:border-violet-800 dark:bg-violet-950/30">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-violet-900 dark:text-violet-300">Add Escrow Email to Your Channel</span>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <ol className="space-y-2 text-sm text-violet-800 dark:text-violet-300">
                    {transferModel === "TRUSTLESS" ? (
                      <>
                        <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-400">1</span> Go to channel settings → Permissions</li>
                        <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-400">2</span> Add the email below as a <strong>co-owner</strong></li>
                        <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-400">3</span> Also add the buyer&apos;s email as <strong>manager</strong></li>
                        <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-400">4</span> Click Submit once both are done</li>
                      </>
                    ) : (
                      <>
                        <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-400">1</span> Go to channel settings → Permissions</li>
                        <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-400">2</span> Add the email below as a <strong>manager</strong></li>
                        <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-400">3</span> Click Submit below to request verification</li>
                      </>
                    )}
                  </ol>
                  {poolEmail ? (
                    <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2.5 dark:border-violet-800 dark:bg-background">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-violet-400">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                      </svg>
                      <span className="flex-1 font-mono text-sm text-violet-900 select-all dark:text-violet-300">{poolEmail.address}</span>
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded-lg bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700 hover:bg-violet-200 transition dark:bg-violet-900/50 dark:text-violet-400 dark:hover:bg-violet-900"
                        onClick={() => { navigator.clipboard.writeText(poolEmail.address); toast.success("Copied!"); }}
                      >
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                          <path d="M4 2a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V2zm2-1a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V2a1 1 0 00-1-1H6z"/>
                          <path d="M2 5a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1v-1h-1v1H2V6h1V5H2z"/>
                        </svg>
                        Copy
                      </button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" isLoading={loading === "load-email"} onClick={loadPoolEmail}>
                      Get escrow email address
                    </Button>
                  )}
                  {poolEmail && (
                    <button
                      type="button"
                      disabled={loading === "submit-manager-add"}
                      onClick={() => call("submit-manager-add", {}, "Submitted — awaiting verification")}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 text-sm font-bold text-white shadow-md shadow-violet-500/25 transition hover:from-violet-600 hover:to-violet-700 disabled:opacity-60"
                    >
                      {loading === "submit-manager-add" ? (
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      ) : (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      )}
                      I&apos;ve added the email — submit for review
                    </button>
                  )}
                </div>
              </div>
            )}
            {isBuyer && (
              <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300">
                <span className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-violet-400" />
                Waiting for the seller to add our escrow email. You&apos;ll be notified once submitted.
              </div>
            )}
            {isAdmin && !isBuyer && !isSeller && (
              <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300">
                <span className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-violet-400" />
                Awaiting seller to submit manager-add confirmation.
              </div>
            )}
          </>
        )}

        {/* ── PENDING_VERIFICATION ── */}
        {status === "PENDING_VERIFICATION" && (
          <>
            {(isSeller || isBuyer) && (
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Under Team Review</p>
                  <p className="text-xs text-amber-700 mt-0.5 dark:text-amber-400">Our team is verifying the manager add. You&apos;ll be notified when complete.</p>
                </div>
              </div>
            )}
            {isAdmin && !isBuyer && !isSeller && (
              <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Verify Manager Add</p>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400">Confirm the escrow email was successfully added to the seller&apos;s channel.</p>
                <Textarea
                  label="Rejection reason (required to reject)"
                  rows={2}
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Reason the manager add was not found or invalid..."
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={loading === "verify-manager-approve"}
                    onClick={() => callAdmin("verify-manager", { approved: true }, "Manager add approved")}
                    className="flex flex-1 h-9 items-center justify-center gap-1.5 rounded-xl bg-success text-xs font-bold text-white hover:opacity-90 transition disabled:opacity-60"
                  >
                    {loading === "verify-manager-approve" ? <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : "Approve ✓"}
                  </button>
                  <button
                    type="button"
                    disabled={loading === "verify-manager-reject" || rejectNotes.trim().length < 5}
                    onClick={() => callAdmin("verify-manager", { approved: false, notes: rejectNotes }, "Manager add rejected")}
                    className="flex flex-1 h-9 items-center justify-center gap-1.5 rounded-xl border border-danger/30 bg-danger/5 text-xs font-bold text-danger hover:bg-danger/10 transition disabled:opacity-40"
                  >
                    {loading === "verify-manager-reject" ? <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : "Reject"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Legacy credential flow: seller submits at FUNDED */}
        {(isSeller || (isAdmin && status === "FUNDED")) && status === "FUNDED" && !transferModel && (
          <div className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                </svg>
              </div>
              <p className="text-sm font-bold text-foreground">Submit Transfer Details{adminSuffix}</p>
            </div>
            <Textarea
              label=""
              rows={4}
              placeholder="Username, password, linked email access, 2FA backup codes, transfer instructions…"
              value={credentialsInput}
              onChange={(e) => setCredentialsInput(e.target.value)}
            />
            <p className="text-xs text-muted">Encrypted at rest — only the buyer can view this after submission.</p>
            <Button isLoading={loading === "submit"} disabled={credentialsInput.trim().length === 0} onClick={() => call("submit", { credentials: credentialsInput }, "Transfer details submitted")}>
              Submit transfer details{adminSuffix}
            </Button>
          </div>
        )}

        {/* View credentials */}
        {(isBuyer || isAdmin) && credentials && ["SUBMITTED", "VERIFIED", "IN_TRANSFER", "COMPLETED", "DISPUTED"].includes(status) && (
          <div className="overflow-hidden rounded-xl border border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/40">
            <div className="flex items-center gap-2 border-b border-brand-100 px-4 py-2.5 dark:border-brand-800">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-brand-600 dark:text-brand-400">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
              </svg>
              <p className="text-sm font-bold text-brand-700 dark:text-brand-300">Account Transfer Details</p>
            </div>
            <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs text-foreground">{credentials}</pre>
          </div>
        )}

        {/* Buyer / admin: verify at SUBMITTED */}
        {(isBuyer || (isAdmin && status === "SUBMITTED")) && status === "SUBMITTED" && (
          <div className="flex flex-col gap-2 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950/40">
            <p className="text-sm font-bold text-brand-800 dark:text-brand-300">Verify Account Access</p>
            <p className="text-xs text-muted">Confirm that you can log in and access the account using the credentials above.</p>
            <button
              type="button"
              disabled={videoBlockingVerify || loading === "verify"}
              title={videoBlockingVerify ? "Complete the verification call first" : undefined}
              onClick={() => {
                if (isAdmin && !isBuyer) {
                  setShowTimerModal(true);
                } else {
                  call("verify", undefined, "Access verified");
                }
              }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-sm font-bold text-white shadow-md shadow-brand-500/25 transition hover:from-brand-600 hover:to-brand-700 disabled:opacity-50"
            >
              {loading === "verify" ? <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
              I&apos;ve verified access ✓{adminSuffix}
            </button>
          </div>
        )}

        {/* Admin: set transfer timer duration before verifying */}
        {showTimerModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowTimerModal(false); }}
          >
            <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-white dark:bg-surface p-5 shadow-2xl">
              <div className="mb-1 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>
                </div>
                <h3 className="text-sm font-bold text-foreground">Set Transfer Timer</h3>
              </div>
              <p className="mb-4 text-xs text-muted">
                Choose how long the seller has to complete the transfer. The countdown starts as soon as you confirm.
              </p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {[1, 3, 5, 7, 14, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTimerDays(String(d))}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                      timerDays === String(d)
                        ? "bg-brand-500 text-white"
                        : "border border-surface-border text-muted hover:border-brand-300 hover:text-foreground",
                    )}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <div className="mb-4 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={timerDays}
                  onChange={(e) => setTimerDays(e.target.value)}
                  className="h-10 w-24 rounded-xl border border-surface-border bg-background px-3 text-sm focus:border-brand-400 focus:outline-none"
                />
                <span className="text-sm text-muted">days</span>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  isLoading={loading === "verify"}
                  disabled={
                    !Number.isInteger(Number(timerDays)) || Number(timerDays) < 1 || Number(timerDays) > 90
                  }
                  onClick={() => {
                    const n = Number(timerDays);
                    call("verify", { days: n }, `Access verified — ${n}-day transfer window started`);
                    setShowTimerModal(false);
                  }}
                >
                  Start countdown
                </Button>
                <Button variant="ghost" onClick={() => setShowTimerModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Seller / admin: confirm buyer added as manager at VERIFIED */}
        {(isSeller || isAdmin) && status === "VERIFIED" && (
          <div className="flex flex-col gap-2 rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-950/30">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              </div>
              <p className="text-sm font-bold text-teal-800 dark:text-teal-300">Start Transfer Countdown</p>
            </div>
            <p className="text-xs text-teal-700 dark:text-teal-400">
              {transferModel === "TRUSTLESS"
                ? "Confirm the buyer has been added as a manager and the escrow email is already a co-owner."
                : "Confirm the buyer has been added as a manager on the channel to start the countdown."}
            </p>
            <button
              type="button"
              disabled={loading === "add-buyer-manager"}
              onClick={() => call("add-buyer-manager", transferModel === "TRUSTLESS" ? { escrowWasOwner: true } : {}, "Transfer countdown started")}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-sm font-bold text-white shadow-md shadow-teal-500/25 transition hover:from-teal-600 hover:to-teal-700 disabled:opacity-60"
            >
              {loading === "add-buyer-manager" ? <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8z"/></svg>}
              {transferModel === "TRUSTLESS" ? "Buyer added as manager — start countdown" : "Confirm buyer added as manager — start countdown"}{adminSuffix}
            </button>
          </div>
        )}

        {/* IN_TRANSFER */}
        {status === "IN_TRANSFER" && (
          <div className="flex flex-col gap-3">
            {countdownEndsAt && (
              <div className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3",
                countdownElapsed ? "border-success/30 bg-success/5" : "border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/40",
              )}>
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", countdownElapsed ? "bg-success/15 text-success" : "bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400")}>
                  {countdownElapsed ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>
                  )}
                </div>
                <div>
                  <p className={cn("text-sm font-bold", countdownElapsed ? "text-success" : "text-brand-700 dark:text-brand-400")}>
                    {countdownElapsed ? "Countdown complete ✓" : `Transfer countdown: ${countdownLabel}`}
                  </p>
                  {!countdownElapsed && (
                    <p className="mt-0.5 text-xs text-muted">Funds release once the countdown elapses and transfer is confirmed.</p>
                  )}
                </div>
              </div>
            )}

            {isSeller && transferModel === "STANDARD" && (
              <button
                type="button"
                disabled={!countdownElapsed || Boolean(sellerConfirmedHandoverAt) || loading === "confirm-handover"}
                title={!countdownElapsed ? "Countdown must elapse before confirming handover" : sellerConfirmedHandoverAt ? "Handover already confirmed" : undefined}
                onClick={() => call("confirm-handover", {}, "Handover confirmed — funds released")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-success to-emerald-600 text-sm font-bold text-white shadow-md shadow-success/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading === "confirm-handover" ? <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>}
                {sellerConfirmedHandoverAt ? "Handover confirmed ✓" : "Confirm handover complete — release funds"}
              </button>
            )}

            {isAdmin && !isBuyer && !isSeller && transferModel === "TRUSTLESS" && (
              <button
                type="button"
                disabled={!countdownElapsed || loading === "execute-trustless"}
                title={!countdownElapsed ? "Countdown must elapse first" : undefined}
                onClick={() => callAdmin("execute-trustless-handover", {}, "Trustless handover executed — funds released")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-success to-emerald-600 text-sm font-bold text-white shadow-md shadow-success/25 transition hover:opacity-90 disabled:opacity-40"
              >
                {loading === "execute-trustless" ? <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : null}
                Execute trustless handover
              </button>
            )}

            {(isBuyer || (isAdmin && !isSeller)) && !transferModel && (
              <button
                type="button"
                disabled={loading === "complete"}
                onClick={() => call("complete", undefined, "Escrow completed — funds released")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-success to-emerald-600 text-sm font-bold text-white shadow-md shadow-success/25 transition hover:opacity-90 disabled:opacity-60"
              >
                {loading === "complete" ? <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>}
                Confirm transfer complete — release funds{adminSuffix}
              </button>
            )}
          </div>
        )}

        {/* Cancel */}
        {(isBuyer || isAdmin) && ["FUNDED", "AWAITING_MANAGER_ADD"].includes(status) && (
          <button
            type="button"
            disabled={loading === "cancel"}
            onClick={async () => {
              const ok = await confirm({
                title: "Cancel this escrow?",
                description: isAdmin ? "Admin action — full refund will be issued." : "You'll be fully refunded including the fee.",
                confirmLabel: "Cancel escrow",
                destructive: true,
              });
              if (ok) call("cancel", {}, "Escrow cancelled — full refund issued");
            }}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface text-sm font-medium text-muted transition hover:border-danger/30 hover:bg-danger/5 hover:text-danger"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
            </svg>
            Cancel escrow — full refund{adminSuffix}
          </button>
        )}

        {/* Dispute */}
        {(isBuyer || isSeller) && ["FUNDED", "AWAITING_MANAGER_ADD", "PENDING_VERIFICATION", "SUBMITTED", "VERIFIED", "IN_TRANSFER"].includes(status) && (
          <div>
            {!showDispute ? (
              <button
                type="button"
                onClick={() => setShowDispute(true)}
                className="flex w-full items-center justify-center gap-1.5 text-sm text-danger/70 transition hover:text-danger"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                Something wrong? Open a dispute
              </button>
            ) : (
              <div className="flex flex-col gap-3 overflow-hidden rounded-xl border border-danger/30 bg-danger/5 p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger/10 text-danger">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-danger">Open a Dispute</p>
                </div>
                <Textarea
                  label="Describe what went wrong"
                  rows={3}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    isLoading={loading === "dispute"}
                    disabled={disputeReason.trim().length < 10}
                    onClick={() => call("dispute", { reason: disputeReason }, "Dispute opened — an admin will review")}
                  >
                    Open dispute
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDispute(false)}>
                    Never mind
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
