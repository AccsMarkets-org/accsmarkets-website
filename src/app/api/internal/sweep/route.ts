import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification, wantsEmail } from "@/lib/notifications";
import { createHmac } from "crypto";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import { subscriptionRenewalReminderTemplate, escrowActionRequiredTemplate } from "@/lib/email-templates";
import type { NotificationType } from "@prisma/client";

const SECRET = process.env.INTERNAL_SWEEP_SECRET;

// This app runs as a single long-lived Node process (see server.js — not
// serverless, not multi-instance), so an in-memory flag is a real, sufficient
// mutex here: it can't prevent overlap across separate processes/hosts, but
// this deployment never has more than one. Previously nothing prevented an
// overlapping run if the scheduled trigger fired again before a slow sweep
// finished, or a manual run collided with the scheduled one.
let sweepRunning = false;

const DAY_MS = 24 * 60 * 60 * 1000;

// Pre-deadline warning dedupe (steps 10-13). Primary check is the same one the
// overdue-transfer step uses: a Notification with this exact link + type in the
// last 24h. That alone isn't enough here, because createNotification writes NO
// row when the recipient has switched that type's in-app preference off — the
// lookup would then miss forever and the warning (and its email) would repeat
// on every 15-minute run. This in-memory map covers that case; it is reliable
// for the same reason sweepRunning is (single long-lived process), and a
// restart costs at most one repeated warning.
const warnedAt = new Map<string, number>();

async function alreadyWarned(link: string, type: NotificationType, now: Date): Promise<boolean> {
  const mem = warnedAt.get(link);
  if (mem !== undefined && now.getTime() - mem < DAY_MS) return true;
  const recent = await prisma.notification.findFirst({
    where: { link, type, createdAt: { gte: new Date(now.getTime() - DAY_MS) } },
    select: { id: true },
  });
  return Boolean(recent);
}

function markWarned(link: string, now: Date) {
  warnedAt.set(link, now.getTime());
  warnedAt.forEach((at, key) => {
    if (now.getTime() - at >= DAY_MS) warnedAt.delete(key);
  });
}

function hoursLeftLabel(deadline: Date, now: Date): string {
  const hours = Math.max(1, Math.ceil((deadline.getTime() - now.getTime()) / (60 * 60 * 1000)));
  return `${hours} hour${hours !== 1 ? "s" : ""}`;
}

export async function POST(req: Request) {
  // Reject if no secret is configured or the caller doesn't send it.
  if (!SECRET || req.headers.get("x-sweep-secret") !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (sweepRunning) {
    return NextResponse.json({ error: "A sweep is already in progress." }, { status: 409 });
  }
  sweepRunning = true;

  const startedAt = Date.now();
  const now = new Date();
  const results: Record<string, number> = {};
  // Each step's error (if any) is recorded by name rather than aborting the
  // whole sweep — previously an unhandled exception partway through silently
  // skipped every later step with no record of which one failed or why.
  const stepErrors: Record<string, string> = {};

  async function runStep(name: string, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      stepErrors[name] = message;
      logger.error("sweep.step_failed", { step: name, error: message });
    }
  }

  try {

  // 0. Clear expired listing promotions (featured / pinned boosts).
  await runStep("promotionsExpired", async () => {
    const expiredFeatured = await prisma.listing.findMany({
      where: { isFeatured: true, featuredUntil: { lt: now } },
      select: { id: true, sellerId: true },
    });
    const expiredPinned = await prisma.listing.findMany({
      where: { isPinned: true, pinnedUntil: { lt: now } },
      select: { id: true, sellerId: true },
    });

    let promotionsCleared = 0;

    if (expiredFeatured.length > 0) {
      await prisma.listing.updateMany({
        where: { isFeatured: true, featuredUntil: { lt: now } },
        data: { isFeatured: false, isPremiumFeatured: false, featuredUntil: null },
      });
      promotionsCleared += expiredFeatured.length;
    }

    if (expiredPinned.length > 0) {
      await prisma.listing.updateMany({
        where: { isPinned: true, pinnedUntil: { lt: now } },
        data: { isPinned: false, pinnedUntil: null },
      });
      promotionsCleared += expiredPinned.length;
    }

    // A bump lifts a listing above un-bumped ones on the default sort; cap that at 7 days.
    const bumpCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    await prisma.listing.updateMany({
      where: { lastBumpedAt: { lt: bumpCutoff } },
      data: { lastBumpedAt: null },
    });

    const notifiedKeys = new Set<string>();
    for (const listing of [...expiredFeatured, ...expiredPinned]) {
      const key = `${listing.sellerId}:${listing.id}`;
      if (notifiedKeys.has(key)) continue;
      notifiedKeys.add(key);
      await createNotification({
        userId: listing.sellerId,
        type: "SYSTEM",
        title: "Listing boost expired",
        body: "Your listing boost has expired. Boost again from your dashboard.",
        link: "/dashboard/listings",
      });
    }

    results.promotionsExpired = promotionsCleared;
  });

  // 1. Expire stale PENDING offers whose expiresAt has passed.
  await runStep("offersExpired", async () => {
    const staleOffers = await prisma.offer.findMany({
      where: { status: "PENDING", expiresAt: { lt: now } },
      select: { id: true, buyerId: true, listing: { select: { id: true, title: true, sellerId: true } } },
    });
    if (staleOffers.length === 0) {
      results.offersExpired = 0;
      return;
    }

    // Re-assert status: "PENDING" so an offer accepted/declined between the
    // read above and this write is not clobbered.
    const expiredOffers = await prisma.offer.updateMany({
      where: { id: { in: staleOffers.map((o) => o.id) }, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    results.offersExpired = expiredOffers.count;

    // Only notify for offers that actually ended up EXPIRED.
    let toNotify = staleOffers;
    if (expiredOffers.count !== staleOffers.length) {
      const confirmed = await prisma.offer.findMany({
        where: { id: { in: staleOffers.map((o) => o.id) }, status: "EXPIRED" },
        select: { id: true },
      });
      const confirmedIds = new Set(confirmed.map((o) => o.id));
      toNotify = staleOffers.filter((o) => confirmedIds.has(o.id));
    }

    for (const offer of toNotify) {
      await Promise.all([
        createNotification({
          userId: offer.buyerId,
          type: "OFFER",
          title: "Offer expired",
          body: `Your offer on "${offer.listing.title}" expired.`,
          link: "/dashboard/offers",
        }),
        createNotification({
          userId: offer.listing.sellerId,
          type: "OFFER",
          title: "Offer expired",
          body: `An offer on "${offer.listing.title}" expired unanswered.`,
          link: "/dashboard/offers",
        }),
      ]).catch(() => null);
    }
  });

  // 2. Flag overdue escrow transfers: find escrows whose transferDeadline has passed
  //    without reaching COMPLETED/CANCELLED/DISPUTED, and notify both parties.
  //    Does NOT auto-cancel — flags for admin attention only.
  await runStep("transfersOverdueFlagged", async () => {
  const overdueEscrows = await prisma.escrow.findMany({
    where: {
      status: { in: ["FUNDED", "AWAITING_MANAGER_ADD", "PENDING_VERIFICATION", "SUBMITTED", "VERIFIED", "IN_TRANSFER"] },
      transferDeadline: { lt: now },
    },
    select: { id: true, buyerId: true, sellerId: true },
  });

  let transferFlagged = 0;
  for (const escrow of overdueEscrows) {
    // Use a notification dedup check: only send if no DISPUTE/SYSTEM notification for
    // this escrow was sent recently (avoid spamming on every sweep run).
    const recentFlag = await prisma.notification.findFirst({
      where: {
        link: `/dashboard/escrows/${escrow.id}`,
        type: "DISPUTE",
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recentFlag) continue;

    const msg = "Transfer deadline has passed without completion. An admin will review shortly.";
    await Promise.all([
      createNotification({
        userId: escrow.buyerId,
        type: "DISPUTE",
        title: "Escrow transfer overdue",
        body: msg,
        link: `/dashboard/escrows/${escrow.id}`,
      }),
      createNotification({
        userId: escrow.sellerId,
        type: "DISPUTE",
        title: "Escrow transfer overdue",
        body: msg,
        link: `/dashboard/escrows/${escrow.id}`,
      }),
    ]);
    transferFlagged++;
  }
  results.transfersOverdueFlagged = transferFlagged;
  });

  // 3. Bulk-delete RateLimitEvent rows older than the longest rate-limit window (1 hour).
  await runStep("rateLimitRowsDeleted", async () => {
  const rateLimitCutoff = new Date(now.getTime() - 60 * 60 * 1000);
  const deletedRateLimit = await prisma.rateLimitEvent.deleteMany({
    where: { createdAt: { lt: rateLimitCutoff } },
  });
  results.rateLimitRowsDeleted = deletedRateLimit.count;
  });

  // 4. Saved-search alerts: for each alertEnabled SavedSearch, check for new listings
  //    since lastNotifiedAt (or createdAt when never notified).
  await runStep("savedSearchAlertsSent", async () => {
  const alertSearches = await prisma.savedSearch.findMany({
    where: { alertEnabled: true },
    include: { user: { select: { id: true } } },
  });

  let alertsSent = 0;
  for (const ss of alertSearches) {
    const since = ss.lastNotifiedAt ?? ss.createdAt;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f = ss.filters as any;
    const newCount = await prisma.listing.count({
      where: {
        status: "ACTIVE",
        createdAt: { gt: since },
        ...(f.platform ? { platform: f.platform } : {}),
        ...(f.monetized === "true" ? { monetized: true } : {}),
        ...(f.minPrice !== undefined ? { price: { gte: Number(f.minPrice) } } : {}),
        ...(f.maxPrice !== undefined ? { price: { lte: Number(f.maxPrice) } } : {}),
        ...(f.minFollowers !== undefined ? { followers: { gte: Number(f.minFollowers) } } : {}),
        ...(f.maxFollowers !== undefined ? { followers: { lte: Number(f.maxFollowers) } } : {}),
      },
    });

    if (newCount > 0) {
      const params = new URLSearchParams(f).toString();
      await createNotification({
        userId: ss.user.id,
        type: "SYSTEM",
        title: `${newCount} new listing${newCount > 1 ? "s" : ""} match "${ss.name}"`,
        body: "New listings match your saved search.",
        link: `/listings?${params}`,
      });
      await prisma.savedSearch.update({
        where: { id: ss.id },
        data: { lastNotifiedAt: now },
      });
      alertsSent++;
    }
  }
  results.savedSearchAlertsSent = alertsSent;
  });

  // 5. Referral milestone rewards: $10 per batch of 10 invites.
  await runStep("referralsRewarded", async () => {
  const MILESTONE_SIZE = 10;
  const MILESTONE_REWARD_USD = 10;
  let referralsRewarded = 0;

  const referrersWithPending = await prisma.referralCode.findMany({
    where: { referrals: { some: { status: "PENDING" } } },
    select: {
      id: true,
      userId: true,
      referrals: { where: { status: "PENDING" }, select: { id: true }, orderBy: { createdAt: "asc" } },
    },
  });

  for (const rc of referrersWithPending) {
    const pendingCount = rc.referrals.length;
    if (pendingCount < MILESTONE_SIZE) continue;

    const batchCount = Math.floor(pendingCount / MILESTONE_SIZE);
    const idsToReward = rc.referrals.slice(0, batchCount * MILESTONE_SIZE).map((r) => r.id);
    const totalReward = batchCount * MILESTONE_REWARD_USD;

    await prisma.$transaction(async (tx) => {
      const referrer = await tx.user.findUniqueOrThrow({ where: { id: rc.userId } });
      const newBal = Number(referrer.walletBalance) + totalReward;
      await tx.user.update({ where: { id: rc.userId }, data: { walletBalance: { increment: totalReward } } });
      await tx.transaction.create({
        data: {
          userId: rc.userId,
          type: "PROMOTION",
          status: "COMPLETED",
          amount: totalReward,
          balanceBefore: referrer.walletBalance,
          balanceAfter: newBal,
        },
      });
      await tx.referral.updateMany({
        where: { id: { in: idsToReward } },
        data: { status: "REWARDED", rewardedAt: now },
      });
    });

    await createNotification({
      userId: rc.userId,
      type: "PAYMENT",
      title: "Referral milestone reached!",
      body: `$${totalReward.toFixed(2)} credited for inviting ${idsToReward.length} friends. Keep sharing!`,
      link: "/dashboard/referrals",
    });
    referralsRewarded += idsToReward.length;
  }
  results.referralsRewarded = referralsRewarded;
  });

  // 6. Retry failed webhook deliveries whose nextRetryAt has passed.
  await runStep("webhooksRetried", async () => {
  const failedDeliveries = await prisma.webhookDelivery.findMany({
    where: { status: "FAILED", nextRetryAt: { lte: now }, attempts: { lt: 5 } },
    include: { endpoint: true },
    take: 50,
  });

  let webhooksRetried = 0;
  for (const delivery of failedDeliveries) {
    if (!delivery.endpoint.enabled) continue;
    const body = JSON.stringify({ event: delivery.eventType, data: delivery.payload, ts: Date.now() });
    const sig = createHmac("sha256", delivery.endpoint.secret).update(body).digest("hex");
    try {
      const res = await fetch(delivery.endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AccsMarkets-Signature": sig,
          "X-AccsMarkets-Event": delivery.eventType,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      const responseBody = (await res.text()).slice(0, 2000);
      if (res.ok) {
        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: { status: "SUCCESS", responseStatus: res.status, responseBody, deliveredAt: now, attempts: { increment: 1 }, nextRetryAt: null },
        });
        webhooksRetried++;
      } else {
        const backoffMs = Math.min(delivery.attempts * 10 * 60_000, 60 * 60_000);
        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: { responseStatus: res.status, responseBody, attempts: { increment: 1 }, nextRetryAt: new Date(now.getTime() + backoffMs) },
        });
      }
    } catch {
      const backoffMs = Math.min(delivery.attempts * 10 * 60_000, 60 * 60_000);
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { attempts: { increment: 1 }, nextRetryAt: new Date(now.getTime() + backoffMs) },
      });
    }
  }
  results.webhooksRetried = webhooksRetried;
  });

  // 7. Flag disputes whose evidence deadline has passed. This does NOT
  //    auto-advance the phase — every transition in PHASE_TRANSITIONS
  //    (src/lib/dispute-phases.ts) other than the buyer/seller-initiated
  //    appeal requires an explicit admin decision (requiresAdmin: true), and
  //    there is no "system"-initiated transition defined anywhere to
  //    automate; inventing one here would be making a policy call this sweep
  //    isn't the place to make. What it does do: once, per dispute, write a
  //    DisputeTimeline entry (actorId: null = system-originated, matching
  //    how phase-change/mediation events are already recorded) and notify
  //    both parties that the deadline passed and an admin needs to move it
  //    to REVIEW — mirroring the existing overdue-escrow-transfer flagging
  //    pattern above, which also flags-for-admin rather than auto-acting.
  await runStep("disputeEvidenceDeadlinesFlagged", async () => {
    const overdueDisputes = await prisma.dispute.findMany({
      where: { phase: "EVIDENCE", evidenceDeadline: { lt: now } },
      include: { escrow: { select: { id: true, buyerId: true, sellerId: true } } },
    });

    let flagged = 0;
    for (const dispute of overdueDisputes) {
      const alreadyFlagged = await prisma.disputeTimeline.findFirst({
        where: { disputeId: dispute.id, eventType: "evidence_deadline_passed" },
      });
      if (alreadyFlagged) continue;

      await prisma.disputeTimeline.create({
        data: {
          disputeId: dispute.id,
          eventType: "evidence_deadline_passed",
          actorId: null,
          description: "Evidence deadline passed with no admin action. Awaiting manual review to advance to REVIEW.",
        },
      });

      const msg = "The evidence deadline for your dispute has passed. An admin will review shortly.";
      await Promise.all([
        createNotification({
          userId: dispute.escrow.buyerId,
          type: "DISPUTE",
          title: "Dispute evidence deadline passed",
          body: msg,
          link: `/dashboard/escrows/${dispute.escrow.id}`,
        }),
        createNotification({
          userId: dispute.escrow.sellerId,
          type: "DISPUTE",
          title: "Dispute evidence deadline passed",
          body: msg,
          link: `/dashboard/escrows/${dispute.escrow.id}`,
        }),
      ]);
      flagged++;
    }
    results.disputeEvidenceDeadlinesFlagged = flagged;
  });

  // 8. Subscription renewal reminders: notify users whose paid plan expires
  //    within the next 3 days so they can renew before losing benefits.
  //    Deduplicated via a SYSTEM notification check — same pattern as the
  //    overdue-escrow-transfer flagging above.
  await runStep("renewalReminders", async () => {
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const freePlan = await prisma.subscriptionPlan.findUnique({ where: { name: "FREE" } });
    const upcomingExpiryUsers = await prisma.user.findMany({
      where: {
        subscriptionExpiresAt: { gte: now, lte: in3Days },
        subscriptionPlanId: freePlan ? { not: freePlan.id } : { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionPlan: { select: { name: true } },
        subscriptionExpiresAt: true,
      },
    });

    let remindersSent = 0;
    for (const u of upcomingExpiryUsers) {
      // Dedup: skip if a renewal-reminder notification was already sent in the last 24h.
      // The row lookup alone misses users who turned SYSTEM in-app off
      // (createNotification writes nothing for them), which re-sent the
      // renewal EMAIL every 15-minute run — same gap steps 10-13 cover with
      // the in-memory map, so use it here too.
      const memKey = `renewal:${u.id}`;
      const memAt = warnedAt.get(memKey);
      if (memAt !== undefined && now.getTime() - memAt < DAY_MS) continue;
      const recentReminder = await prisma.notification.findFirst({
        where: {
          userId: u.id,
          type: "SYSTEM",
          link: "/dashboard/settings/subscription",
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          title: { contains: "subscription expires" },
        },
      });
      if (recentReminder) continue;
      markWarned(memKey, now);

      const planName = u.subscriptionPlan?.name ?? "paid";
      const expiresAt = u.subscriptionExpiresAt!;
      const daysLeft = Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

      await createNotification({
        userId: u.id,
        type: "SYSTEM",
        title: `Your ${planName} subscription expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
        body: `Your ${planName} subscription expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Renew now to keep your benefits.`,
        link: "/dashboard/settings/subscription",
      });

      if (u.email) {
        const renewalDate = expiresAt.toLocaleDateString("en-US", { dateStyle: "long" });
        const tpl = subscriptionRenewalReminderTemplate(
          u.name ?? u.email,
          planName,
          renewalDate,
          "",
          "",
        );
        sendEmail({ to: u.email, subject: tpl.subject, html: tpl.html }).catch(() => null);
      }

      remindersSent++;
    }
    results.renewalReminders = remindersSent;
  });

  // 9. Revert expired paid subscriptions to Free. Billing is prepaid/
  //    non-recurring (a purchase buys a flat 30-day period, nothing
  //    auto-charges again) — before this step, NOTHING anywhere reverted a
  //    user once subscriptionExpiresAt passed, so paid-plan benefits (higher
  //    listing limits, lower fees, etc.) never actually expired. Runs
  //    unconditionally on expiry, independent of whether the user ever set
  //    subscriptionCancelAtPeriodEnd — that flag only affects notification
  //    copy (see api/payments/cancel-subscription), not entitlement.
  await runStep("subscriptionsExpired", async () => {
    const freePlan = await prisma.subscriptionPlan.findUnique({ where: { name: "FREE" } });
    const expiredUsers = await prisma.user.findMany({
      where: {
        subscriptionExpiresAt: { lt: now },
        subscriptionPlanId: freePlan ? { not: freePlan.id } : { not: null },
      },
      select: { id: true, subscriptionPlan: { select: { name: true } } },
    });

    for (const u of expiredUsers) {
      await prisma.user.update({
        where: { id: u.id },
        data: {
          subscriptionPlanId: freePlan?.id ?? null,
          subscriptionExpiresAt: null,
          subscriptionCancelAtPeriodEnd: false,
        },
      });
      await createNotification({
        userId: u.id,
        type: "SYSTEM",
        title: "Subscription expired",
        body: `Your ${u.subscriptionPlan?.name ?? "paid"} plan has ended and your account moved to the Free plan.`,
        link: "/dashboard/settings/subscription",
      });
    }
    results.subscriptionsExpired = expiredUsers.length;
  });

  // 10. Escrow transfer-deadline warnings — until now both parties only heard
  //     about a deadline AFTER it passed (step 2). Warn once when it is under
  //     24h away, and email whoever the current status is waiting on.
  await runStep("escrowDeadlineWarnings", async () => {
    const dueSoon = await prisma.escrow.findMany({
      where: {
        status: { in: ["FUNDED", "AWAITING_MANAGER_ADD", "PENDING_VERIFICATION", "SUBMITTED", "VERIFIED", "IN_TRANSFER"] },
        transferDeadline: { gte: now, lte: new Date(now.getTime() + DAY_MS) },
      },
      select: {
        id: true,
        status: true,
        transferModel: true,
        transferDeadline: true,
        listing: { select: { title: true } },
        buyer: { select: { id: true, email: true, name: true, username: true } },
        seller: { select: { id: true, email: true, name: true, username: true } },
      },
    });

    let warned = 0;
    for (const escrow of dueSoon) {
      const link = `/dashboard/escrows/${escrow.id}?r=deadline`;
      if (await alreadyWarned(link, "ESCROW", now)) continue;
      markWarned(link, now);

      const deadline = escrow.transferDeadline!;
      const left = hoursLeftLabel(deadline, now);
      const body = `The transfer deadline for "${escrow.listing.title}" is in about ${left}. Complete any outstanding step before it passes.`;
      await Promise.all(
        [escrow.buyer.id, escrow.seller.id].map((userId) =>
          createNotification({ userId, type: "ESCROW", title: "Escrow deadline approaching", body, link }),
        ),
      );

      // Who the current status is waiting on. The verification / admin-driven
      // and countdown-driven states have no single actor, so both get the email.
      let actors: ("buyer" | "seller")[] = ["buyer", "seller"];
      let actionTitle = "Your escrow deadline is approaching";
      let requiredAction = "Open the escrow and complete any outstanding step on your side before the deadline.";
      let buttonText = "Review escrow";
      if (escrow.status === "FUNDED") {
        actors = ["seller"];
        actionTitle = "Submit the transfer details";
        requiredAction = `The buyer has funded "${escrow.listing.title}". Submit the account transfer details before the deadline.`;
        buttonText = "Submit details";
      } else if (escrow.status === "AWAITING_MANAGER_ADD") {
        actors = ["seller"];
        actionTitle = "Add the escrow manager";
        requiredAction = `Add the escrow manager email to "${escrow.listing.title}" and confirm it on the escrow page before the deadline.`;
        buttonText = "Open escrow";
      } else if (escrow.status === "IN_TRANSFER" && !escrow.transferModel) {
        actors = ["buyer"];
        actionTitle = "Confirm you received the account";
        requiredAction = `Check that you have full access to "${escrow.listing.title}", then confirm receipt to release the escrow — or open a dispute if something is wrong.`;
        buttonText = "Confirm receipt";
      }

      const deadlineLabel = `${deadline.toUTCString()} (about ${left} left)`;
      for (const role of actors) {
        const party = escrow[role];
        if (!party.email || !(await wantsEmail(party.id, "ESCROW"))) continue;
        const tpl = escrowActionRequiredTemplate(
          party.name ?? party.username ?? "there",
          escrow.id,
          actionTitle,
          requiredAction,
          buttonText,
          deadlineLabel,
        );
        sendEmail({ to: party.email, subject: tpl.subject, html: tpl.html }).catch(() => null);
      }
      warned++;
    }
    results.escrowDeadlineWarnings = warned;
  });

  // 11. Dispute evidence-deadline warnings — counterpart of step 7, fired while
  //     there is still time to upload evidence.
  await runStep("disputeEvidenceWarnings", async () => {
    const closingSoon = await prisma.dispute.findMany({
      where: { phase: "EVIDENCE", evidenceDeadline: { gte: now, lte: new Date(now.getTime() + DAY_MS) } },
      select: {
        id: true,
        evidenceDeadline: true,
        escrow: { select: { id: true, buyerId: true, sellerId: true } },
      },
    });

    let warned = 0;
    for (const dispute of closingSoon) {
      const link = `/dashboard/escrows/${dispute.escrow.id}?r=evidence`;
      if (await alreadyWarned(link, "DISPUTE", now)) continue;
      markWarned(link, now);

      const body = `The evidence window for your dispute closes in about ${hoursLeftLabel(dispute.evidenceDeadline!, now)}. Submit any remaining statements or files before then.`;
      await Promise.all(
        [dispute.escrow.buyerId, dispute.escrow.sellerId].map((userId) =>
          createNotification({ userId, type: "DISPUTE", title: "Dispute evidence deadline approaching", body, link }),
        ),
      );
      warned++;
    }
    results.disputeEvidenceWarnings = warned;
  });

  // 12. Offer expiry warnings — tell the seller while they can still respond
  //     (step 1 only reports the offer once it's already EXPIRED).
  await runStep("offerExpiryWarnings", async () => {
    const expiringOffers = await prisma.offer.findMany({
      where: { status: "PENDING", expiresAt: { gte: now, lte: new Date(now.getTime() + 12 * 60 * 60 * 1000) } },
      select: { id: true, sellerId: true, listing: { select: { title: true } } },
    });

    let warned = 0;
    for (const offer of expiringOffers) {
      const link = `/dashboard/offers?r=expiring-${offer.id}`;
      if (await alreadyWarned(link, "OFFER", now)) continue;
      markWarned(link, now);

      await createNotification({
        userId: offer.sellerId,
        type: "OFFER",
        title: "Offer expiring soon",
        body: `An offer on "${offer.listing.title}" expires in under 12 hours. Accept, counter or decline it before it lapses.`,
        link,
      });
      warned++;
    }
    results.offerExpiryWarnings = warned;
  });

  // 13. Boost expiry warnings — step 0 only notifies after the placement is gone.
  await runStep("boostExpiryWarnings", async () => {
    const in24h = new Date(now.getTime() + DAY_MS);
    const endingBoosts = await prisma.listing.findMany({
      where: {
        OR: [
          { isFeatured: true, featuredUntil: { gte: now, lte: in24h } },
          { isPinned: true, pinnedUntil: { gte: now, lte: in24h } },
        ],
      },
      select: { id: true, title: true, sellerId: true },
    });

    let warned = 0;
    for (const listing of endingBoosts) {
      const link = `/dashboard/listings?r=boost-${listing.id}`;
      if (await alreadyWarned(link, "LISTING", now)) continue;
      markWarned(link, now);

      await createNotification({
        userId: listing.sellerId,
        type: "LISTING",
        title: "Your boost ends tomorrow",
        body: `Your boost on "${listing.title}" ends tomorrow — extend it to keep your placement.`,
        link,
      });
      warned++;
    }
    results.boostExpiryWarnings = warned;
  });

  } finally {
    sweepRunning = false;
  }

  const durationMs = Date.now() - startedAt;
  const hasErrors = Object.keys(stepErrors).length > 0;
  logger.info("sweep.completed", { results, stepErrors, durationMs, hasErrors });

  return NextResponse.json({ ok: !hasErrors, results, stepErrors, durationMs });
}
