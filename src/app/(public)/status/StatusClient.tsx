"use client";

import { useEffect, useState } from "react";

interface HealthChecks {
  api: boolean;
  database: boolean;
  realtime: boolean;
  escrow: boolean;
}

interface HealthState {
  ok: boolean;
  status: "ok" | "degraded";
  checks: HealthChecks;
}

// Each label maps to its own key in HealthChecks — previously all 4 rows
// mirrored one aggregate boolean, so a real outage in only the realtime or
// escrow-critical path still showed "All systems operational" as long as the
// database alone was reachable. Each row now reflects its own independent
// check computed server-side in /api/health.
const SERVICES: { key: keyof HealthChecks; label: string }[] = [
  { key: "api", label: "API & Website" },
  { key: "database", label: "Database" },
  { key: "realtime", label: "Real-time messaging (Socket.IO)" },
  { key: "escrow", label: "Escrow processing" },
];

export function StatusClient({ initial }: { initial: HealthState }) {
  const [health, setHealth] = useState<HealthState>(initial);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setLastChecked(new Date());
    const interval = setInterval(async () => {
      setChecking(true);
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const data = await res.json();
        setHealth({
          ok: res.ok,
          status: data.status,
          checks: data.checks ?? { api: false, database: false, realtime: false, escrow: false },
        });
      } catch {
        setHealth({ ok: false, status: "degraded", checks: { api: false, database: false, realtime: false, escrow: false } });
      } finally {
        setLastChecked(new Date());
        setChecking(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const allOperational = health.status === "ok";

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <div
          className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${
            allOperational ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-amber-100 dark:bg-amber-950/40"
          }`}
        >
          {allOperational ? (
            <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          )}
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          {allOperational ? "All systems operational" : "Degraded performance detected"}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {lastChecked
            ? `Last checked ${lastChecked.toLocaleTimeString()}${checking ? " · checking…" : ""}`
            : "Checking…"}
          {" · auto-refreshes every 30s"}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-surface-border">
        {SERVICES.map((s, i) => {
          const serviceOk = health.checks[s.key];
          return (
            <div
              key={s.key}
              className={`flex items-center justify-between px-5 py-4 ${
                i > 0 ? "border-t border-surface-border" : ""
              }`}
            >
              <span className="text-sm font-medium text-foreground">{s.label}</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  serviceOk
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${serviceOk ? "bg-emerald-500" : "bg-amber-500"}`} />
                {serviceOk ? "Operational" : "Degraded"}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-muted">
        For urgent issues, contact{" "}
        <a href="mailto:support@accsmarkets.org" className="text-brand-600 hover:underline">
          support@accsmarkets.org
        </a>
      </p>
    </main>
  );
}
