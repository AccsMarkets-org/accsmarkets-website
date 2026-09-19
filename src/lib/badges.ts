import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import type { AchievementBadgeType } from "@prisma/client";

const DEAL_THRESHOLDS: { count: number; badge: AchievementBadgeType }[] = [
  { count: 5,   badge: "RISING_STAR" },
  { count: 25,  badge: "POWER_SELLER" },
  { count: 100, badge: "TOP_SELLER" },
  { count: 500, badge: "LEGEND" },
];

const VOLUME_THRESHOLDS: { usd: number; badge: AchievementBadgeType }[] = [
  { usd: 1000,  badge: "BIG_EARNER" },
  { usd: 10000, badge: "WHALE" },
];

const BADGE_LABEL: Record<AchievementBadgeType, string> = {
  RISING_STAR:    "Rising Star",
  POWER_SELLER:   "Power Seller",
  TOP_SELLER:     "Top Seller",
  LEGEND:         "Legend",
  BIG_EARNER:     "Big Earner",
  WHALE:          "Whale",
  FIVE_STAR_SELLER: "Five-Star Seller",
  FAST_RESPONDER: "Fast Responder",
  TRUSTED_SELLER: "Trusted Seller",
};

export async function checkAndAwardBadges(userId: string): Promise<void> {
  const [dealCount, volumeResult, existing] = await Promise.all([
    prisma.escrow.count({ where: { sellerId: userId, status: "COMPLETED" } }),
    prisma.escrow.aggregate({
      where: { sellerId: userId, status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.userAchievementBadge.findMany({ where: { userId }, select: { badge: true } }),
  ]);

  const existingBadges = new Set(existing.map((e) => e.badge));
  const totalVolume = Number(volumeResult._sum.amount ?? 0);

  const toAward: AchievementBadgeType[] = [];

  for (const { count, badge } of DEAL_THRESHOLDS) {
    if (dealCount >= count && !existingBadges.has(badge)) toAward.push(badge);
  }
  for (const { usd, badge } of VOLUME_THRESHOLDS) {
    if (totalVolume >= usd && !existingBadges.has(badge)) toAward.push(badge);
  }

  for (const badge of toAward) {
    await prisma.userAchievementBadge.create({ data: { userId, badge } });
    await createNotification({
      userId,
      type: "SYSTEM",
      title: `🏅 You earned: ${BADGE_LABEL[badge]}`,
      body: "Check your profile to see your new badge.",
      link: "/dashboard/settings",
    });
  }
}
