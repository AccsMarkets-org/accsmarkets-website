"use client";

import { ESCROW_STEPS, ESCROW_STEPS_LEGACY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { EscrowStatus, TransferModel } from "@prisma/client";

const STEP_META: Record<string, { short: string; icon: React.ReactNode }> = {
  FUNDED: {
    short: "Funded",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
      </svg>
    ),
  },
  AWAITING_MANAGER_ADD: {
    short: "Manager",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
      </svg>
    ),
  },
  PENDING_VERIFICATION: {
    short: "Verify",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd"/>
      </svg>
    ),
  },
  SUBMITTED: {
    short: "Submitted",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
      </svg>
    ),
  },
  VERIFIED: {
    short: "Verified",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
      </svg>
    ),
  },
  IN_TRANSFER: {
    short: "Transfer",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z"/>
      </svg>
    ),
  },
  COMPLETED: {
    short: "Done",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
      </svg>
    ),
  },
};

export function EscrowStepper({
  status,
  transferModel = null,
}: {
  status: EscrowStatus;
  transferModel?: TransferModel | null;
}) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/10 text-muted">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
          </svg>
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">Escrow Cancelled</p>
          <p className="text-xs text-muted">This escrow was cancelled and funds refunded.</p>
        </div>
      </div>
    );
  }

  if (status === "DISPUTED") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-danger/10 text-danger">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
        </span>
        <div>
          <p className="text-sm font-bold text-danger">Under Dispute Review</p>
          <p className="text-xs text-muted">Our team is reviewing the dispute. You&apos;ll be notified of the outcome.</p>
        </div>
      </div>
    );
  }

  const steps = transferModel != null ? ESCROW_STEPS : ESCROW_STEPS_LEGACY;
  const currentIndex = steps.indexOf(status);

  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-1">
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        const meta = STEP_META[step];

        return (
          <div key={step} className="flex min-w-0 flex-1 flex-col items-center">
            {/* Connector + circle row */}
            <div className="flex w-full items-center">
              <div className={cn("h-0.5 flex-1 transition-all duration-500", i === 0 ? "invisible" : done || current ? "bg-brand-500" : "bg-surface-border")} />
              <div className="relative shrink-0">
                {current && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-brand-400 opacity-30" />
                )}
                <div
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300",
                    done && "border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-500/30",
                    current && "border-brand-500 bg-brand-500/10 text-brand-600 shadow-lg shadow-brand-500/25 ring-4 ring-brand-500/10 dark:text-brand-400",
                    !done && !current && "border-surface-border bg-background text-muted",
                  )}
                >
                  {done ? (
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd"/>
                    </svg>
                  ) : (
                    meta?.icon
                  )}
                </div>
              </div>
              <div className={cn("h-0.5 flex-1 transition-all duration-500", i === steps.length - 1 ? "invisible" : done ? "bg-brand-500" : "bg-surface-border")} />
            </div>
            {/* Label */}
            <span
              className={cn(
                "mt-2 text-center text-[10px] font-semibold leading-tight transition-colors",
                current && "text-brand-600",
                done && "text-foreground",
                !done && !current && "text-muted",
              )}
            >
              {meta?.short ?? step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
