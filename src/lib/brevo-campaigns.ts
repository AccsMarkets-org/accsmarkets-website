// Advanced Brevo campaign helpers — segmented daily promotions + one-off
// transactional sends (welcome, inactive nudge, listing alert, weekly digest).
// All bulk sends deduplicate via MarketingEmailLog so a user never gets the
// same campaign twice in a day regardless of which endpoint triggers it.

import { prisma } from "@/lib/db";
import { sendBrevoEmail } from "@/lib/brevo";
import { logger } from "@/lib/logger";

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH_LIMIT = 200; // stay well under Brevo free-tier 300/day cap

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://accsmarkets.org";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DailyPromoStats {
  sent: number;
  skipped: number;
  errors: number;
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
}

// ─── Dedup helpers ───────────────────────────────────────────────────────────

async function alreadySent(userId: string, campaign: string, cooldownDays = 1): Promise<boolean> {
  const row = await prisma.marketingEmailLog.findFirst({
    where: {
      userId,
      campaign,
      sentAt: { gt: new Date(Date.now() - cooldownDays * DAY_MS) },
    },
    select: { id: true },
  });
  return row !== null;
}

async function logSent(userId: string, campaign: string): Promise<void> {
  await prisma.marketingEmailLog.create({ data: { userId, campaign } });
}

/** Returns a date-scoped campaign key, e.g. "daily-active-2026-09-21". */
function dateCampaign(segment: string): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `daily-${segment}-${ymd}`;
}

function displayName(u: UserRow): string {
  return u.name ?? u.username ?? "there";
}

// ─── Email HTML builders ──────────────────────────────────────────────────────

const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FOOTER = `<tr><td style="background:#111827;padding:20px 40px;color:#6b7280;font-size:12px;"><p style="margin:0;">© AccsMarkets &nbsp;·&nbsp; <a href="${BASE_URL}/dashboard/settings" style="color:#6b7280;">Manage email preferences</a></p></td></tr>`;

function wrap(inner: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f2;font-family:${FONT};">
<table width="100%" style="background:#f5f4f2;padding:32px 0;" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="600" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);" cellpadding="0" cellspacing="0">
${inner}
${FOOTER}
</table></td></tr></table></body></html>`;
}

function header(eyebrow: string, headline: string, sub: string): string {
  return `<tr><td style="background:#fff;border-top:4px solid #f97316;padding:32px 40px 24px;">
<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#f97316;font-weight:700;margin-bottom:16px;">${eyebrow}</div>
<h1 style="font-size:26px;font-weight:800;color:#111827;margin:0 0 8px;">${headline}</h1>
<p style="color:#6b7280;margin:0 0 20px;">${sub}</p>`;
}

function cta(label: string, url: string): string {
  return `<p style="margin:24px 0 0;"><a href="${url}" style="background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;display:inline-block;">${label}</a></p>`;
}

// Active users — show top 5 listings from their preferred platforms
function buildActiveUserEmail(
  name: string,
  listings: Array<{ title: string; platform: string; price: string; id: string }>,
): { subject: string; htmlContent: string } {
  const rows = listings
    .slice(0, 5)
    .map(
      (l) => `<tr>
  <td style="padding:10px 0;border-bottom:1px solid #f0ede9;">
    <a href="${BASE_URL}/listings/${l.id}" style="font-weight:700;color:#111827;text-decoration:none;">${l.title}</a>
    <span style="color:#a8a29e;font-size:12px;margin-left:8px;">${l.platform}</span>
    <span style="float:right;color:#f97316;font-weight:700;">$${l.price}</span>
  </td>
</tr>`,
    )
    .join("");

  return {
    subject: "New listings you might like on AccsMarkets",
    htmlContent: wrap(
      header("YOUR PICKS", `Hey ${name}, fresh listings await!`, "Based on what you've been browsing — don't let them go.") +
      `<table width="100%" cellpadding="0" cellspacing="0">${rows || '<tr><td style="padding:12px 0;color:#6b7280;">New listings are added daily — come check them out!</td></tr>'}</table>` +
      cta("Browse all listings", `${BASE_URL}/listings`) +
      "</td></tr>",
    ),
  };
}

// Inactive 7-30d — "you're missing out"
function buildMissingOutEmail(
  name: string,
  newCount: number,
): { subject: string; htmlContent: string } {
  return {
    subject: `You're missing out — ${newCount > 0 ? `${newCount} new listings` : "fresh listings"} added`,
    htmlContent: wrap(
      header(
        "ACCSMARKETS",
        `Hey ${name}, you're missing out!`,
        `${newCount > 0 ? `${newCount} new account listings have been added` : "New account listings keep coming in"} since your last visit. Don't let the best deals slip by.`,
      ) +
      cta("See new listings", `${BASE_URL}/listings`) +
      "</td></tr>",
    ),
  };
}

// Inactive 30d+ — "come back, discount prompt"
function buildComeBackEmail(name: string): { subject: string; htmlContent: string } {
  return {
    subject: "We've saved your spot — come back to AccsMarkets",
    htmlContent: wrap(
      header(
        "WE MISS YOU",
        `We miss you, ${name}!`,
        "It's been a while since your last visit. Your account is safe and we have hundreds of new social media accounts listed across Instagram, YouTube, TikTok, and more.",
      ) +
      `<p style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 18px;color:#92400e;margin:0 0 4px;">
  Use code <strong style="color:#c2410c;">COMEBACK10</strong> for a discount on your next purchase.
</p>` +
      cta("Come back now", `${BASE_URL}/listings`) +
      "</td></tr>",
    ),
  };
}

// Single-user: welcome
function buildWelcomeEmail(name: string): { subject: string; htmlContent: string } {
  return {
    subject: "Welcome to AccsMarkets — your marketplace for social media accounts",
    htmlContent: wrap(
      header(
        "WELCOME",
        `Welcome, ${name}!`,
        "You're now part of AccsMarkets — the trusted marketplace for buying and selling verified social media accounts.",
      ) +
      `<ul style="color:#374151;padding-left:20px;line-height:1.9;margin:0 0 20px;">
  <li>Browse thousands of verified Instagram, YouTube, TikTok &amp; more accounts</li>
  <li>Secure escrow on every transaction — your money is always protected</li>
  <li>Trusted sellers with real reviews and KYC verification</li>
</ul>` +
      cta("Start browsing", `${BASE_URL}/listings`) +
      "</td></tr>",
    ),
  };
}

// Single-user: inactive nudge (per-user targeting)
function buildInactiveUserEmail(name: string, days: number): { subject: string; htmlContent: string } {
  return {
    subject: `We haven't seen you in ${days} days — come back to AccsMarkets`,
    htmlContent: wrap(
      header(
        "COME BACK",
        `We haven't seen you in ${days} days`,
        `Hey ${name}, your AccsMarkets account is ready when you are. New listings go live daily — here's a quick look at what's trending.`,
      ) +
      cta("See what's new", `${BASE_URL}/listings`) +
      "</td></tr>",
    ),
  };
}

// Single-user: new listing alert
function buildNewListingAlertEmail(
  name: string,
  listings: Array<{ title: string; platform: string; price: string; id: string }>,
): { subject: string; htmlContent: string } {
  const rows = listings
    .slice(0, 5)
    .map(
      (l) => `<tr>
  <td style="padding:10px 0;border-bottom:1px solid #f0ede9;">
    <a href="${BASE_URL}/listings/${l.id}" style="font-weight:700;color:#111827;text-decoration:none;">${l.title}</a>
    <span style="color:#a8a29e;font-size:12px;margin-left:8px;">${l.platform}</span>
    <span style="float:right;color:#f97316;font-weight:700;">$${l.price}</span>
  </td>
</tr>`,
    )
    .join("");

  return {
    subject: "New listings matching your interests on AccsMarkets",
    htmlContent: wrap(
      header("NEW LISTINGS", `Hey ${name}, fresh picks for you!`, "New accounts just listed that match what you've been looking for.") +
      `<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>` +
      cta("View all listings", `${BASE_URL}/listings`) +
      "</td></tr>",
    ),
  };
}

// Single-user: weekly digest
function buildWeeklyDigestEmail(
  name: string,
  stats: { newListings: number; activeDeals: number },
): { subject: string; htmlContent: string } {
  return {
    subject: "Your AccsMarkets weekly digest",
    htmlContent: wrap(
      header("WEEKLY DIGEST", `Your week at AccsMarkets, ${name}`, "Here's a quick summary of what happened on the marketplace this week.") +
      `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
  <tr>
    <td width="50%" style="padding:16px;background:#fff7ed;border-radius:12px;text-align:center;">
      <div style="font-size:32px;font-weight:800;color:#f97316;">${stats.newListings}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">New listings this week</div>
    </td>
    <td width="8px"></td>
    <td width="50%" style="padding:16px;background:#f0fdf4;border-radius:12px;text-align:center;">
      <div style="font-size:32px;font-weight:800;color:#16a34a;">${stats.activeDeals}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">Deals completed</div>
    </td>
  </tr>
</table>` +
      cta("Explore the marketplace", `${BASE_URL}/listings`) +
      "</td></tr>",
    ),
  };
}

// ─── Exported functions ───────────────────────────────────────────────────────

/**
 * Bulk daily promotional email — segments all opted-in, email-verified users
 * by recent activity and sends appropriate content for each segment.
 * Uses date-scoped campaign keys so the same user is never emailed twice in
 * the same calendar day regardless of how many times the caller invokes this.
 */
export async function sendDailyPromotionalEmail(): Promise<DailyPromoStats> {
  const stats: DailyPromoStats = { sent: 0, skipped: 0, errors: 0 };

  const now = Date.now();
  const active7dCutoff   = new Date(now - 7 * DAY_MS);
  const inactive30dCutoff = new Date(now - 30 * DAY_MS);

  // Fetch all eligible users (opted-in + verified) in one query
  const candidates = await prisma.user.findMany({
    where: {
      marketingOptOut: false,
      isBanned: false,
      emailVerified: { not: null },
    },
    select: { id: true, email: true, name: true, username: true, lastSeenAt: true },
    take: BATCH_LIMIT,
  }) as (UserRow & { lastSeenAt: Date | null })[];

  // Count new listings added in the last 7 days for the "missing out" copy
  const recentListingCount = await prisma.listing.count({
    where: {
      status: "ACTIVE",
      createdAt: { gte: active7dCutoff },
    },
  });

  for (const u of candidates) {
    const name = displayName(u);
    const seen = u.lastSeenAt ? u.lastSeenAt.getTime() : 0;

    // Determine segment
    let segment: "active" | "inactive7" | "inactive30";
    if (seen >= active7dCutoff.getTime()) {
      segment = "active";
    } else if (seen >= inactive30dCutoff.getTime()) {
      segment = "inactive7";
    } else {
      segment = "inactive30";
    }

    const campaign = dateCampaign(segment);

    if (await alreadySent(u.id, campaign)) {
      stats.skipped++;
      continue;
    }

    try {
      if (segment === "active") {
        // Get the platforms this user has recently browsed
        const viewedRows = await prisma.$queryRawUnsafe<{ platform: string }[]>(
          `SELECT DISTINCT l.platform FROM ListingViewEvent lve
           JOIN Listing l ON l.id = lve.listingId
           WHERE lve.userId = ? AND lve.createdAt > ?
           LIMIT 5`,
          u.id,
          active7dCutoff,
        );
        const platforms = viewedRows.map((r) => r.platform);

        // Fetch top 5 active listings for those platforms (fallback: any platform)
        const listingRows = await prisma.$queryRawUnsafe<
          { id: string; title: string; platform: string; price: string }[]
        >(
          platforms.length > 0
            ? `SELECT id, title, platform, CAST(price AS CHAR) AS price FROM Listing
               WHERE status = 'ACTIVE' AND platform IN (${platforms.map(() => "?").join(",")})
               ORDER BY createdAt DESC LIMIT 5`
            : `SELECT id, title, platform, CAST(price AS CHAR) AS price FROM Listing
               WHERE status = 'ACTIVE' ORDER BY createdAt DESC LIMIT 5`,
          ...(platforms.length > 0 ? platforms : []),
        );

        const { subject, htmlContent } = buildActiveUserEmail(name, listingRows);
        await sendBrevoEmail({ to: u.email, toName: name, subject, htmlContent });
      } else if (segment === "inactive7") {
        const { subject, htmlContent } = buildMissingOutEmail(name, recentListingCount);
        await sendBrevoEmail({ to: u.email, toName: name, subject, htmlContent });
      } else {
        const { subject, htmlContent } = buildComeBackEmail(name);
        await sendBrevoEmail({ to: u.email, toName: name, subject, htmlContent });
      }

      await logSent(u.id, campaign);
      stats.sent++;
    } catch (err) {
      logger.error("daily_promo_send_failed", { userId: u.id, segment, error: String(err) });
      stats.errors++;
    }
  }

  return stats;
}

/**
 * Sends a welcome email to a single newly-registered user.
 * Safe to call from the register API — uses Brevo transactional send.
 */
export async function sendWelcomeEmail(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, username: true, marketingOptOut: true, emailVerified: true },
  });
  if (!user || user.marketingOptOut || !user.emailVerified) return;

  const campaign = "welcome_brevo";
  if (await alreadySent(userId, campaign, 36500)) return; // one-time

  const name = user.name ?? user.username ?? "there";
  const { subject, htmlContent } = buildWelcomeEmail(name);

  try {
    await sendBrevoEmail({ to: user.email, toName: name, subject, htmlContent });
    await logSent(userId, campaign);
  } catch (err) {
    logger.error("welcome_email_failed", { userId, error: String(err) });
  }
}

/**
 * Sends a personalised re-engagement email to a single inactive user.
 */
export async function sendInactiveUserEmail(userId: string, daysSinceLogin: number): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, username: true, marketingOptOut: true, emailVerified: true },
  });
  if (!user || user.marketingOptOut || !user.emailVerified) return;

  const campaign = `inactive_personal_${daysSinceLogin}d`;
  if (await alreadySent(userId, campaign, 30)) return;

  const name = user.name ?? user.username ?? "there";
  const { subject, htmlContent } = buildInactiveUserEmail(name, daysSinceLogin);

  try {
    await sendBrevoEmail({ to: user.email, toName: name, subject, htmlContent });
    await logSent(userId, campaign);
  } catch (err) {
    logger.error("inactive_user_email_failed", { userId, error: String(err) });
  }
}

/**
 * Sends a new-listing alert to a specific user.
 */
export async function sendNewListingAlert(
  userId: string,
  listings: Array<{ id: string; title: string; platform: string; price: number | string }>,
): Promise<void> {
  if (!listings.length) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, username: true, marketingOptOut: true, emailVerified: true },
  });
  if (!user || user.marketingOptOut || !user.emailVerified) return;

  const campaign = dateCampaign("listing_alert");
  if (await alreadySent(userId, campaign)) return;

  const name = user.name ?? user.username ?? "there";
  const mapped = listings.map((l) => ({
    id: l.id,
    title: l.title,
    platform: l.platform,
    price: String(l.price),
  }));
  const { subject, htmlContent } = buildNewListingAlertEmail(name, mapped);

  try {
    await sendBrevoEmail({ to: user.email, toName: name, subject, htmlContent });
    await logSent(userId, campaign);
  } catch (err) {
    logger.error("new_listing_alert_failed", { userId, error: String(err) });
  }
}

/**
 * Sends a weekly digest to a single user.
 */
export async function sendWeeklyDigest(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, username: true, marketingOptOut: true, emailVerified: true },
  });
  if (!user || user.marketingOptOut || !user.emailVerified) return;

  const weekCampaign = (() => {
    const d = new Date();
    const week = Math.ceil(d.getDate() / 7);
    return `weekly_digest_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-w${week}`;
  })();
  if (await alreadySent(userId, weekCampaign, 7)) return;

  const weekAgo = new Date(Date.now() - 7 * DAY_MS);
  const [newListings, activeDeals] = await Promise.all([
    prisma.listing.count({ where: { status: "ACTIVE", createdAt: { gte: weekAgo } } }),
    prisma.escrow.count({ where: { status: "COMPLETED", completedAt: { gte: weekAgo } } }),
  ]);

  const name = user.name ?? user.username ?? "there";
  const { subject, htmlContent } = buildWeeklyDigestEmail(name, { newListings, activeDeals });

  try {
    await sendBrevoEmail({ to: user.email, toName: name, subject, htmlContent });
    await logSent(userId, weekCampaign);
  } catch (err) {
    logger.error("weekly_digest_failed", { userId, error: String(err) });
  }
}
