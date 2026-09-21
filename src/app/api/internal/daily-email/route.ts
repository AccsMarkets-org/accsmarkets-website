import { NextResponse } from "next/server";
import { isBrevoConfigured } from "@/lib/brevo";
import { sendDailyPromotionalEmail } from "@/lib/brevo-campaigns";
import { logger } from "@/lib/logger";

// Daily promotional email endpoint — triggered by an external cron (e.g. GitHub
// Actions, Windows Task Scheduler, or a third-party cron service) via:
//   POST /api/internal/daily-email
//   Authorization: Bearer <CRON_SECRET>
//
// Returns { sent, skipped, errors } so the caller can log/alert on anomalies.

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!cronSecret || token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isBrevoConfigured()) {
    return NextResponse.json(
      { error: "Brevo not configured — set BREVO_API_KEY to enable daily emails." },
      { status: 503 },
    );
  }

  try {
    const stats = await sendDailyPromotionalEmail();
    logger.info("daily_email_sweep_complete", stats);
    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    logger.error("daily_email_sweep_error", { error: String(err) });
    return NextResponse.json({ error: "Internal error", detail: String(err) }, { status: 500 });
  }
}
