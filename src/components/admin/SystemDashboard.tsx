"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { CircleCheck, CircleX } from "lucide-react";

interface QueueStat {
  name: string;
  waiting?: number;
  active?: number;
  failed?: number;
  error?: string;
}

interface HealthData {
  status: "ok" | "degraded";
  db: { ok: boolean; latencyMs: number };
  sockets: { connections: number };
  process: { uptimeSeconds: number };
  queues?: QueueStat[];
  ts: string;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", ok ? "bg-success" : "bg-danger")} />
      {label}
    </span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-6 shadow-sm">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">{title}</h3>
      {children}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function SystemDashboard() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      const json = await res.json();
      setData(json);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 30_000);
    return () => clearInterval(id);
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" />
        Checking health…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6 text-sm text-danger">
        Failed to reach <code>/api/health</code>. The server may be unreachable.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall status banner */}
      <div
        className={cn(
          "flex items-center justify-between rounded-2xl border p-5",
          data.status === "ok"
            ? "border-success/30 bg-success/5"
            : "border-danger/30 bg-danger/5",
        )}
      >
        <div className="flex items-center gap-3">
          <span className={cn("shrink-0", data.status === "ok" ? "text-success" : "text-danger")}>
            {data.status === "ok" ? <CircleCheck className="h-7 w-7" strokeWidth={1.75} aria-hidden /> : <CircleX className="h-7 w-7" strokeWidth={1.75} aria-hidden />}
          </span>
          <div>
            <p className={cn("font-semibold", data.status === "ok" ? "text-success" : "text-danger")}>
              {data.status === "ok" ? "All systems operational" : "Degraded — check details below"}
            </p>
            <p className="text-xs text-muted">
              Last checked: {lastChecked ? lastChecked.toLocaleTimeString() : "—"}
            </p>
          </div>
        </div>
        <button
          onClick={fetchHealth}
          className="rounded-xl border border-surface-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand-300"
        >
          Refresh
        </button>
      </div>

      <div className={`grid gap-4 ${data.queues && data.queues.length > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        {/* Database */}
        <Card title="Database">
          <div className="mb-4">
            <StatusBadge ok={data.db.ok} label={data.db.ok ? "Connected" : "Unreachable"} />
          </div>
          <MetricRow label="Latency" value={data.db.ok ? `${data.db.latencyMs} ms` : "—"} />
        </Card>

        {/* Socket.IO */}
        <Card title="WebSockets">
          <div className="mb-4">
            <StatusBadge ok={true} label="Running" />
          </div>
          <MetricRow label="Active connections" value={data.sockets.connections} />
        </Card>

        {/* Process */}
        <Card title="Process">
          <div className="mb-4">
            <StatusBadge ok={true} label="Running" />
          </div>
          <MetricRow label="Uptime" value={formatUptime(data.process.uptimeSeconds)} />
          <MetricRow label="Environment" value={process.env.NODE_ENV ?? "unknown"} />
        </Card>

        {/* Job Queues */}
        {data.queues && data.queues.length > 0 && (
          <Card title="Job Queues">
            <div className="mb-4">
              <StatusBadge ok={!data.queues.some((q) => q.error)} label={data.queues.some((q) => q.error) ? "Error" : "Connected"} />
            </div>
            {data.queues.map((q) => (
              <div key={q.name}>
                <p className="mt-2 text-xs font-semibold text-muted uppercase tracking-wide">{q.name}</p>
                {q.error ? (
                  <p className="text-xs text-danger">{q.error}</p>
                ) : (
                  <>
                    <MetricRow label="Waiting" value={q.waiting ?? 0} />
                    <MetricRow label="Active" value={q.active ?? 0} />
                    <MetricRow label="Failed" value={<span className={(q.failed ?? 0) > 0 ? "text-danger" : ""}>{q.failed ?? 0}</span>} />
                  </>
                )}
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* Raw JSON for ops */}
      <details className="rounded-xl border border-surface-border">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-muted hover:text-foreground">
          Raw health response
        </summary>
        <pre className="overflow-x-auto p-4 text-xs text-muted">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}
