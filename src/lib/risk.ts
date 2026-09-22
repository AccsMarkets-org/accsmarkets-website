import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { RiskSeverity } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { adminHighRiskAlertTemplate } from "@/lib/email-templates";

export interface RiskFactor {
  key: string;
  label: string;
  weight: number; // 0–100
  detail?: string;
}

export interface ComputeRiskResult {
  score: number;
  severity: RiskSeverity;
  factors: RiskFactor[];
}

function toSeverity(score: number): RiskSeverity {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}

export async function computeRiskScore(userId: string): Promise<ComputeRiskResult> {
  const factors: RiskFactor[] = [];

  const [user, deviceFingerprints, openEscrows, allEscrows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        listings: { select: { price: true, createdAt: true } },
      },
    }),
    prisma.deviceFingerprint.findMany({ where: { userId }, select: { fingerprintHash: true } }),
    prisma.escrow.findMany({
      where: { status: { in: ["DISPUTED"] }, OR: [{ buyerId: userId }, { sellerId: userId }] },
      select: { id: true, status: true, buyerId: true, sellerId: true, createdAt: true },
    }),
    prisma.escrow.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      select: { id: true, status: true, buyerId: true, sellerId: true, fundedAt: true },
    }),
  ]);

  if (!user) return { score: 0, severity: "LOW", factors: [] };

  // Rule 1: Multi-account device fingerprint
  for (const fp of deviceFingerprints) {
    const sharedCount = await prisma.deviceFingerprint.count({
      where: { fingerprintHash: fp.fingerprintHash, userId: { not: userId } },
    });
    if (sharedCount > 0) {
      factors.push({
        key: "multi_account_device",
        label: "Device shared with other accounts",
        weight: 40,
        detail: `${sharedCount} other account(s) use the same device fingerprint`,
      });
      break;
    }
  }

  // Rule 2: New account with high-price listing (< 7 days old, any listing > $200)
  const accountAgeDays = (Date.now() - user.createdAt.getTime()) / 86_400_000;
  const highPriceListings = user.listings.filter((l) => Number(l.price) > 200);
  if (accountAgeDays < 7 && highPriceListings.length > 0) {
    factors.push({
      key: "new_account_high_price",
      label: "New account with high-value listing",
      weight: 30,
      detail: `Account is ${Math.floor(accountAgeDays)} day(s) old with ${highPriceListings.length} listing(s) over $200`,
    });
  }

  // Rule 3: Fund-then-dispute cycle — escrows that were funded then disputed
  const fundedDisputed = allEscrows.filter(
    (e) => e.status === "DISPUTED" && e.fundedAt !== null,
  );
  if (fundedDisputed.length >= 2) {
    factors.push({
      key: "fund_then_dispute",
      label: "Repeated fund-then-dispute pattern",
      weight: 35,
      detail: `${fundedDisputed.length} escrow(s) funded then moved to disputed`,
    });
  }

  // Rule 4: Repeated disputes involving same counterparty
  const disputedCounterpartyIds: string[] = openEscrows.map((e) =>
    e.buyerId === userId ? e.sellerId : e.buyerId,
  );
  const counterpartyCounts = disputedCounterpartyIds.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});
  const maxRepeat = Math.max(0, ...Object.values(counterpartyCounts));
  if (maxRepeat >= 2) {
    factors.push({
      key: "repeated_dispute_counterparty",
      label: "Multiple disputes with same user",
      weight: 25,
      detail: `${maxRepeat} disputes with the same counterparty`,
    });
  }

  // Clamp composite score to 0–100
  const rawScore = factors.reduce((sum, f) => sum + f.weight, 0);
  const score = Math.min(100, rawScore);
  const severity = toSeverity(score);

  return { score, severity, factors };
}

/**
 * Emails ADMIN_EMAIL about a high-risk event. Best-effort, never throws.
 * `transactionId` / `ip` are optional context for the template.
 */
export function notifyAdminHighRisk(params: {
  userId: string;
  flagId: string;
  triggeredRule: string;
  score: number;
  transactionId?: string;
  ip?: string;
}): void {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;
  try {
    const { subject, html } = adminHighRiskAlertTemplate(
      params.userId,
      params.flagId,
      params.triggeredRule,
      String(params.score),
      params.transactionId ?? "",
      new Date().toLocaleDateString("en-US", { dateStyle: "long" }),
      params.ip ?? "",
    );
    sendEmail({ to: adminEmail, subject, html }).catch(() => null);
  } catch (err) {
    logger.error("notifyAdminHighRisk failed", { userId: params.userId, err });
  }
}

/**
 * Recomputes and stores the user's RiskScore. Returns the computed result (or
 * null on failure) so callers that gate on severity — e.g. withdrawals — can
 * use the fresh value without a second read. Never throws.
 *
 * A HIGH/CRITICAL result raises a SecurityFlag and alerts the admin only when
 * the user has no open `risk_engine` flag already: this now runs on every
 * fingerprint post and withdrawal, and a flag per recompute would flood both.
 */
export async function upsertRiskScore(userId: string): Promise<ComputeRiskResult | null> {
  try {
    const result = await computeRiskScore(userId);
    const { score, severity, factors } = result;
    await prisma.riskScore.upsert({
      where: { userId },
      create: { userId, score, severity, factors: factors as object[], computedAt: new Date() },
      update: { score, severity, factors: factors as object[], computedAt: new Date(), dismissedAt: null },
    });
    if (severity === "HIGH" || severity === "CRITICAL") {
      const open = await prisma.securityFlag.findFirst({
        where: { userId, source: "risk_engine", resolvedAt: null },
        select: { id: true },
      });
      if (!open) {
        const flag = await prisma.securityFlag.create({
          data: {
            userId,
            source: "risk_engine",
            severity,
            reason: `Risk score ${score} (${severity}): ${factors.map((f) => f.label).join("; ")}`,
          },
        });
        notifyAdminHighRisk({ userId, flagId: flag.id, triggeredRule: factors[0]?.label ?? severity, score });
      }
    }
    return result;
  } catch (err) {
    logger.error("upsertRiskScore failed", { userId, err });
    return null;
  }
}

export async function recordDeviceFingerprint(userId: string, fingerprintHash: string): Promise<void> {
  try {
    await prisma.deviceFingerprint.upsert({
      where: { userId_fingerprintHash: { userId, fingerprintHash } },
      create: { userId, fingerprintHash },
      update: { lastSeenAt: new Date() },
    });
  } catch (err) {
    logger.error("recordDeviceFingerprint failed", { userId, err });
  }
}
