import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { isBrevoConfigured, sendBrevoEmail } from "@/lib/brevo";
import { sendDailyPromotionalEmail } from "@/lib/brevo-campaigns";
import { logger } from "@/lib/logger";
import {
  newSignupNudgeTemplate,
  inactiveWinbackTemplate,
  offerAbandonedTemplate,
  generalPromoTemplate,
  sellerFeesPromoTemplate,
} from "@/lib/email-templates";

// Automated re-engagement email sweep — runs daily
// (scripts/run-marketing-sweep.sh via cron on the Linux server, or
// scripts/run-marketing-sweep.ps1 via Windows Task Scheduler), same
// external-trigger pattern as src/app/api/internal/sweep/route.ts. Each
// segment has its own dedup/cooldown via MarketingEmailLog so nobody gets
// the same campaign twice in the same window.
//
// Segments 1-3 (behavioral, targeted) query via $queryRaw/$executeRaw for
// historical reasons; that's kept for consistency within this file rather
// than mixing raw and typed access, even though marketingOptOut/
// MarketingEmailLog are both on the generated Prisma client now.

const SECRET = process.env.INTERNAL_SWEEP_SECRET;

const DAY_MS = 24 * 60 * 60 * 1000;
const NEW_SIGNUP_MIN_AGE_DAYS = 3;
const INACTIVE_MIN_DAYS = 30;
const INACTIVE_COOLDOWN_DAYS = 60;
const OFFER_ABANDONED_MIN_HOURS = 24;
const GENERAL_PROMO_COOLDOWN_DAYS = 14;
// Brevo's free tier caps at 300 sends/day — this segment alone is bounded
// well under that, leaving headroom for other Brevo sends (e.g. admin
// one-off campaigns) the same day.
const GENERAL_PROMO_BATCH_LIMIT = 200;

interface Candidate {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
}

async function alreadySent(userId: string, campaign: string, cooldownDays: number): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    "SELECT id FROM MarketingEmailLog WHERE userId = ? AND campaign = ? AND sentAt > ? LIMIT 1",
    userId, campaign, new Date(Date.now() - cooldownDays * DAY_MS),
  );
  return rows.length > 0;
}

async function logSent(userId: string, campaign: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    "INSERT INTO MarketingEmailLog (id, userId, campaign, sentAt) VALUES (UUID(), ?, ?, NOW(3))",
    userId, campaign,
  );
}

export async function POST(req: Request) {
  if (!SECRET || req.headers.get("x-sweep-secret") !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, number> = {
    newSignupNudgeSent: 0,
    inactiveWinbackSent: 0,
    offerAbandonedSent: 0,
    generalPromoSent: 0,
    dailyPromoSent: 0,
    dailyPromoSkipped: 0,
    dailyPromoErrors: 0,
  };

  // ── 1. New signups, 3+ days old, zero listings and zero offers made ──────
  const newSignupCandidates = await prisma.$queryRawUnsafe<Candidate[]>(
    `SELECT u.id, u.email, u.name, u.username FROM User u
     WHERE u.createdAt < ?
       AND u.marketingOptOut = false
       AND u.isBanned = false
       AND u.emailVerified IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM Listing l WHERE l.sellerId = u.id)
       AND NOT EXISTS (SELECT 1 FROM Offer o WHERE o.buyerId = u.id)
     LIMIT 500`,
    new Date(Date.now() - NEW_SIGNUP_MIN_AGE_DAYS * DAY_MS),
  );
  for (const u of newSignupCandidates) {
    // One-time campaign — any prior send at all (no cooldown window) skips it.
    if (await alreadySent(u.id, "new_signup_nudge", 36500)) continue;
    // Only log a send that was actually handed to a transport — this campaign
    // is one-time, so logging a failed send would lose it for good.
    const sent = await sendEmail({ to: u.email, ...newSignupNudgeTemplate(u.name ?? u.username ?? "there") }).catch(() => false);
    if (!sent) continue;
    await logSent(u.id, "new_signup_nudge");
    results.newSignupNudgeSent++;
  }

  // ── 2. Returning users inactive 30+ days, with real history (excludes the
  //      brand-new segment above — those get the nudge, not the win-back) ──
  const inactiveCandidates = await prisma.$queryRawUnsafe<Candidate[]>(
    `SELECT u.id, u.email, u.name, u.username FROM User u
     WHERE u.marketingOptOut = false
       AND u.isBanned = false
       AND u.emailVerified IS NOT NULL
       AND (u.lastSeenAt IS NULL OR u.lastSeenAt < ?)
       AND u.createdAt < ?
       AND (
         EXISTS (SELECT 1 FROM Listing l WHERE l.sellerId = u.id)
         OR EXISTS (SELECT 1 FROM Offer o WHERE o.buyerId = u.id)
       )
     LIMIT 500`,
    new Date(Date.now() - INACTIVE_MIN_DAYS * DAY_MS),
    new Date(Date.now() - INACTIVE_MIN_DAYS * DAY_MS),
  );
  for (const u of inactiveCandidates) {
    if (await alreadySent(u.id, "inactive_winback", INACTIVE_COOLDOWN_DAYS)) continue;
    const sent = await sendEmail({ to: u.email, ...inactiveWinbackTemplate(u.name ?? u.username ?? "there") }).catch(() => false);
    if (!sent) continue;
    await logSent(u.id, "inactive_winback");
    results.inactiveWinbackSent++;
  }

  // ── 3. Accepted offers never funded — real "abandoned checkout" signal ──
  // buyer's marketingOptOut isn't on the generated client yet (regen is
  // currently OOM-blocked — see file header), so the offer lookup only
  // selects pre-existing fields; the opt-out/ban check goes through the
  // same raw-SQL path as segments 1 and 2 above.
  const abandoned = await prisma.offer.findMany({
    where: {
      status: "ACCEPTED",
      updatedAt: { lt: new Date(Date.now() - OFFER_ABANDONED_MIN_HOURS * 60 * 60 * 1000) },
      escrow: null,
    },
    select: {
      id: true,
      buyerId: true,
      listing: { select: { title: true } },
    },
    take: 500,
  });
  for (const offer of abandoned) {
    const rows = await prisma.$queryRawUnsafe<
      { email: string; name: string | null; username: string | null; marketingOptOut: number; isBanned: number }[]
    >("SELECT email, name, username, marketingOptOut, isBanned FROM User WHERE id = ? LIMIT 1", offer.buyerId);
    const buyer = rows[0];
    if (!buyer || buyer.marketingOptOut || buyer.isBanned) continue;
    if (await alreadySent(offer.buyerId, "offer_abandoned", 36500)) continue;
    const sent = await sendEmail({
      to: buyer.email,
      ...offerAbandonedTemplate(buyer.name ?? buyer.username ?? "there", offer.listing.title, offer.id),
    }).catch(() => false);
    if (!sent) continue;
    await logSent(offer.buyerId, "offer_abandoned");
    results.offerAbandonedSent++;
  }

  // ── 4. Recurring general promo — full opted-in base, new and old alike,
  //      not tied to any behavior. Sent via Brevo (not Gmail SMTP like the
  //      segments above) since this is real bulk marketing volume, alternating
  //      between two angles run-to-run so repeat recipients don't see the same
  //      email every cycle. Skips silently if Brevo isn't configured. ──────
  if (isBrevoConfigured()) {
    const promoCandidates = await prisma.$queryRawUnsafe<Candidate[]>(
      `SELECT u.id, u.email, u.name, u.username FROM User u
       WHERE u.marketingOptOut = false
         AND u.isBanned = false
         AND u.emailVerified IS NOT NULL
       LIMIT ?`,
      GENERAL_PROMO_BATCH_LIMIT,
    );
    const useAltAngle = new Date().getDate() % 2 === 0;
    for (const u of promoCandidates) {
      if (await alreadySent(u.id, "general_promo", GENERAL_PROMO_COOLDOWN_DAYS)) continue;
      const displayName = u.name ?? u.username ?? "there";
      const tpl = useAltAngle ? sellerFeesPromoTemplate(displayName) : generalPromoTemplate(displayName);
      try {
        await sendBrevoEmail({ to: u.email, toName: displayName, subject: tpl.subject, htmlContent: tpl.html });
        await logSent(u.id, "general_promo");
        results.generalPromoSent++;
      } catch (err) {
        logger.error("general_promo_send_failed", { userId: u.id, error: String(err) });
      }
    }
  }

  // ── 5. Segmented daily promotional send via Brevo ──────────────────────────
  // Sends activity-segmented emails (active users / inactive 7-30d / inactive
  // 30d+) through Brevo. Date-scoped campaign keys prevent re-sends if both
  // this sweep AND the dedicated /api/internal/daily-email endpoint run on the
  // same day — the second invocation will find all keys already logged and skip.
  if (isBrevoConfigured()) {
    try {
      const dailyStats = await sendDailyPromotionalEmail();
      results.dailyPromoSent    = dailyStats.sent;
      results.dailyPromoSkipped = dailyStats.skipped;
      results.dailyPromoErrors  = dailyStats.errors;
    } catch (err) {
      logger.error("daily_promo_sweep_failed", { error: String(err) });
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
