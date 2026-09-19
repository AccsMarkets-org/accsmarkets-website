import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { createHmac } from "crypto";
import { logger } from "@/lib/logger";

const SECRET = process.env.INTERNAL_SWEEP_SECRET;

// This app runs as a single long-lived Node process (see server.js — not
// serverless, not multi-instance), so an in-memory flag is a real, sufficient
// mutex here: it can't prevent overlap across separate processes/hosts, but
// this deployment never has more than one. Previously nothing prevented an
// overlapping run if the scheduled trigger fired again before a slow sweep
// finished, or a manual run collided with the scheduled one.
let sweepRunning = false;

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

  // 1. Expire stale PENDING offers whose expiresAt has passed.
  await runStep("offersExpired", async () => {
    const expiredOffers = await prisma.offer.updateMany({
      where: { status: "PENDING", expiresAt: { lt: now } },
      data: { status: "EXPIRED" },
    });
    results.offersExpired = expiredOffers.count;
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

  // 8. Revert expired paid subscriptions to Free. Billing is prepaid/
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

  } finally {
    sweepRunning = false;
  }

  const durationMs = Date.now() - startedAt;
  const hasErrors = Object.keys(stepErrors).length > 0;
  logger.info("sweep.completed", { results, stepErrors, durationMs, hasErrors });

  return NextResponse.json({ ok: !hasErrors, results, stepErrors, durationMs });
}
