/**
 * AccsMarkets – Internal Maintenance Sweep Trigger
 *
 * Calls POST /api/internal/sweep on the running app (offer expiry, overdue-escrow
 * flagging, saved-search alerts, referral milestone rewards, webhook retry) — see
 * src/app/api/internal/sweep/route.ts for what each pass actually does.
 *
 * This script itself does no work — it's a thin authenticated trigger, run on a
 * schedule so the sweep endpoint (previously dead code, never invoked) actually runs.
 *
 * Run manually:  node scripts/sweep.mjs
 * Auto:          see setup-sweep-task.bat (Windows Task Scheduler, every 15 min)
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Load .env (same minimal parser as backup.mjs) ───────────────────────────────
function loadEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const SECRET = process.env.INTERNAL_SWEEP_SECRET;
// The app listens on PORT (see ecosystem.config.js) — hit it directly on localhost
// rather than through the public domain/tunnel, since this always runs on the same box.
const PORT = process.env.PORT || "3000";
const URL = `http://localhost:${PORT}/api/internal/sweep`;

if (!SECRET) {
  console.error(`[${new Date().toISOString()}] INTERNAL_SWEEP_SECRET is not set — aborting.`);
  process.exit(1);
}

try {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "x-sweep-secret": SECRET },
    signal: AbortSignal.timeout(30_000),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`[${new Date().toISOString()}] sweep failed: HTTP ${res.status} ${body}`);
    process.exit(1);
  }
  console.log(`[${new Date().toISOString()}] sweep ok: ${body}`);
} catch (err) {
  console.error(`[${new Date().toISOString()}] sweep request failed:`, err instanceof Error ? err.message : err);
  process.exit(1);
}
