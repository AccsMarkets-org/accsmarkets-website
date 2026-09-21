import { StatusClient } from "./StatusClient";

export const metadata = {
  title: "System Status",
  description: "Live status of AccsMarkets services — API, database, escrow and real-time messaging — refreshed automatically so you can check for incidents.",
  alternates: { canonical: "/status" },
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

interface HealthChecks {
  api: boolean;
  database: boolean;
  realtime: boolean;
  escrow: boolean;
}

async function getHealth() {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL ?? "https://accsmarkets.org"}/api/health`, {
      cache: "no-store",
    });
    const data = await res.json();
    const checks: HealthChecks = data.checks ?? { api: false, database: false, realtime: false, escrow: false };
    return { ok: res.ok, status: data.status as "ok" | "degraded", checks };
  } catch {
    return { ok: false, status: "degraded" as const, checks: { api: false, database: false, realtime: false, escrow: false } };
  }
}

export default async function StatusPage() {
  const initial = await getHealth();
  return <StatusClient initial={initial} />;
}
