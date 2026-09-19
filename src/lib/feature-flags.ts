import { prisma } from "@/lib/db";

/**
 * Check if a feature flag is enabled for a given userId.
 * Uses rolloutPct to do a deterministic bucket assignment based on userId hash.
 */
export async function isFeatureEnabled(key: string, userId?: string): Promise<boolean> {
  try {
    const flag = await prisma.featureFlag.findUnique({ where: { key } });
    if (!flag || !flag.enabled) return false;
    if (flag.rolloutPct >= 100) return true;
    if (flag.rolloutPct <= 0) return false;
    // Deterministic bucketing: sum of char codes mod 100
    const seed = userId ?? "anonymous";
    const bucket = [...seed].reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0) % 100;
    return bucket < flag.rolloutPct;
  } catch {
    return false;
  }
}
