"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  deadline: string;
  status: string;
}

function formatTimeLeft(ms: number): { days: number; hours: number; minutes: number; seconds: number; expired: boolean } {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    expired: false,
  };
}

function TimeUnit({ value, label, urgent }: { value: number; label: string; urgent: boolean }) {
  const display = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border-2 font-black tabular-nums transition-all duration-300",
          urgent
            ? "border-danger/40 bg-danger/10 text-danger shadow-lg shadow-danger/20"
            : "border-warning/40 bg-warning/10 text-warning shadow-md shadow-warning/10",
        )}
        style={{ fontSize: "1.6rem", letterSpacing: "-0.02em" }}
      >
        {/* Subtle inner divider line */}
        <div
          className={cn(
            "pointer-events-none absolute left-0 top-1/2 h-px w-full -translate-y-px opacity-30",
            urgent ? "bg-danger" : "bg-warning",
          )}
        />
        {display}
      </div>
      <span className={cn("text-[10px] font-semibold uppercase tracking-wider", urgent ? "text-danger" : "text-muted")}>
        {label}
      </span>
    </div>
  );
}

export function TransferCountdown({ deadline, status }: Props) {
  const [timeLeft, setTimeLeft] = useState(() =>
    formatTimeLeft(new Date(deadline).getTime() - Date.now()),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(formatTimeLeft(new Date(deadline).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const activeStatuses = ["FUNDED", "SUBMITTED", "VERIFIED", "IN_TRANSFER"];
  if (!activeStatuses.includes(status)) return null;

  if (timeLeft.expired) {
    return (
      <div className="flex items-center gap-4 overflow-hidden rounded-2xl border border-danger/30 bg-danger/5 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-danger">Transfer Deadline Passed</p>
          <p className="mt-0.5 text-xs text-muted">The seller did not complete the transfer in time. You may open a dispute.</p>
        </div>
      </div>
    );
  }

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 6;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border p-4",
        isUrgent
          ? "border-danger/30 bg-danger/5"
          : "border-warning/30 bg-warning/5",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", isUrgent ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning")}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
          </svg>
        </div>
        <p className={cn("text-xs font-bold uppercase tracking-widest", isUrgent ? "text-danger" : "text-warning")}>
          {isUrgent ? "Deadline Approaching!" : "Transfer Deadline"}
        </p>
        {isUrgent && (
          <span className="ml-auto flex h-2 w-2 animate-pulse rounded-full bg-danger" />
        )}
      </div>

      <div className="flex items-center gap-2">
        <TimeUnit value={timeLeft.days} label="Days" urgent={isUrgent} />
        <span className={cn("mb-5 text-2xl font-black", isUrgent ? "text-danger/50" : "text-warning/50")}>:</span>
        <TimeUnit value={timeLeft.hours} label="Hours" urgent={isUrgent} />
        <span className={cn("mb-5 text-2xl font-black", isUrgent ? "text-danger/50" : "text-warning/50")}>:</span>
        <TimeUnit value={timeLeft.minutes} label="Min" urgent={isUrgent} />
        <span className={cn("mb-5 text-2xl font-black", isUrgent ? "text-danger/50" : "text-warning/50")}>:</span>
        <TimeUnit value={timeLeft.seconds} label="Sec" urgent={isUrgent} />
      </div>

      {isUrgent && (
        <p className="mt-3 text-xs font-medium text-danger">
          The seller must complete the transfer urgently or you can open a dispute.
        </p>
      )}
    </div>
  );
}
