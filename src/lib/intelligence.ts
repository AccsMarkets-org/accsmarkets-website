/**
 * AccsMarkets Intelligence — AI-powered analysis, recommendations,
 * pricing suggestions, and market-trend aggregation.
 *
 * All heavy AI calls use the project's multi-provider ai.ts abstraction
 * (Groq → Grok → OpenAI → Gemini fallback chain).
 */

import { prisma } from "@/lib/db";
import { generateWithAI } from "@/lib/ai";
import { Platform } from "@prisma/client";

// ─── Return types ────────────────────────────────────────────────────────────

export interface ListingInsights {
  priceAssessment: "underpriced" | "fair" | "overpriced";
  suggestedPriceRange: { min: number; max: number };
  demandLevel: "low" | "medium" | "high";
  strengths: string[];
  improvements: string[];
  sellerTips: string[];
  summary: string;
}

export interface Recommendations {
  listings: Array<{
    id: string;
    title: string;
    platform: string;
    price: number;
    reason: string;
  }>;
  insight: string;
}

export interface RiskAnalysis {
  riskLevel: "low" | "medium" | "high" | "critical";
  score: number;
  flags: string[];
  summary: string;
  recommendation: string;
}

export interface PricingSuggestion {
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  confidence: "low" | "medium" | "high";
  rationale: string;
  comparables: number; // number of similar sold listings used
}

export interface MarketTrends {
  topPlatforms: Array<{ platform: string; avgPrice: number; listingCount: number; soldCount: number }>;
  avgPriceByPlatform: Record<string, number>;
  totalActiveListings: number;
  totalCompletedEscrows: number;
  avgEscrowValue: number;
  recentActivity: {
    newListings7d: number;
    completedEscrows7d: number;
    avgSalePrice7d: number;
  };
  aiInsight: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeParseJSON<T>(text: string, fallback: T): T {
  // Strip markdown code fences if present
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    return JSON.parse(clean) as T;
  } catch {
    return fallback;
  }
}

// ─── analyzeListing ───────────────────────────────────────────────────────────

export async function analyzeListing(listingId: string): Promise<ListingInsights> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      title: true,
      platform: true,
      price: true,
      followers: true,
      engagementRate: true,
      accountAgeMonths: true,
      monetized: true,
      niche: true,
      description: true,
      viewCount: true,
      status: true,
    },
  });

  if (!listing) throw new Error("Listing not found");

  // Pull comparable sold listings on the same platform
  const comparables = await prisma.escrow.findMany({
    where: {
      status: "COMPLETED",
      listing: {
        platform: listing.platform,
        status: "SOLD",
      },
    },
    select: {
      amount: true,
      listing: {
        select: {
          price: true,
          followers: true,
          monetized: true,
          niche: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const compData = comparables.map((c) => ({
    price: Number(c.amount),
    followers: c.listing.followers ?? 0,
    monetized: c.listing.monetized,
    niche: c.listing.niche,
  }));

  const prompt = `
You are AccsMarkets Intelligence, an AI analyst for a social-media-account marketplace.

Analyze this listing and return a JSON object ONLY (no markdown, no explanation outside JSON):

LISTING DATA:
- Platform: ${listing.platform}
- Title: ${listing.title}
- Price: $${Number(listing.price)}
- Followers: ${listing.followers ?? "N/A"}
- Engagement Rate: ${listing.engagementRate ?? "N/A"}%
- Account Age: ${listing.accountAgeMonths ?? "N/A"} months
- Monetized: ${listing.monetized}
- Niche: ${listing.niche ?? "Not specified"}
- Description (first 500 chars): ${listing.description.slice(0, 500)}
- Current views on listing: ${listing.viewCount}

COMPARABLE SOLD LISTINGS (${compData.length} recent sales on ${listing.platform}):
${compData.length > 0 ? JSON.stringify(compData.slice(0, 10)) : "No comparable sales yet."}

Return exactly this JSON shape:
{
  "priceAssessment": "underpriced" | "fair" | "overpriced",
  "suggestedPriceRange": { "min": number, "max": number },
  "demandLevel": "low" | "medium" | "high",
  "strengths": ["...up to 3 bullet points"],
  "improvements": ["...up to 3 bullet points"],
  "sellerTips": ["...up to 3 actionable tips"],
  "summary": "2-3 sentence overall assessment"
}
`.trim();

  const fallback: ListingInsights = {
    priceAssessment: "fair",
    suggestedPriceRange: { min: Number(listing.price) * 0.9, max: Number(listing.price) * 1.1 },
    demandLevel: "medium",
    strengths: ["Listed on a popular platform"],
    improvements: ["Add more details to description"],
    sellerTips: ["Respond quickly to buyer inquiries"],
    summary: "This listing appears to be fairly priced for the current market.",
  };

  try {
    const result = await generateWithAI(prompt, { jsonMode: true, maxTokens: 1024 });
    return safeParseJSON<ListingInsights>(result.text, fallback);
  } catch {
    return fallback;
  }
}

// ─── getUserRecommendations ───────────────────────────────────────────────────

export async function getUserRecommendations(userId: string): Promise<Recommendations> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      primaryIntent: true,
      sellIntentPlatforms: true,
      countryCode: true,
      escrowsAsBuyer: {
        select: {
          listing: {
            select: { platform: true, niche: true, price: true },
          },
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      },
      watchlist: {
        select: {
          listing: {
            select: { platform: true, niche: true, price: true },
          },
        },
        take: 10,
      },
    },
  });

  if (!user) throw new Error("User not found");

  // Infer preferred platforms from history
  const historyPlatforms = [
    ...user.escrowsAsBuyer.map((e) => e.listing.platform),
    ...user.watchlist.map((w) => w.listing.platform),
  ];

  // Fetch candidate listings
  const topPlatformFilter: Platform[] = [];
  if (historyPlatforms.length > 0) {
    const topPlatform = historyPlatforms
      .reduce<Record<string, number>>((acc, p) => { acc[p] = (acc[p] ?? 0) + 1; return acc; }, {});
    const sorted = Object.entries(topPlatform).sort((a, b) => b[1] - a[1]);
    sorted.slice(0, 3).forEach(([p]) => { if (Object.values(Platform).includes(p as Platform)) topPlatformFilter.push(p as Platform); });
  }

  const candidates = await prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      NOT: { sellerId: userId },
      ...(topPlatformFilter.length > 0 ? { platform: { in: topPlatformFilter } } : {}),
    },
    select: {
      id: true,
      title: true,
      platform: true,
      price: true,
      followers: true,
      niche: true,
      viewCount: true,
    },
    orderBy: [{ isFeatured: "desc" }, { viewCount: "desc" }],
    take: 10,
  });

  if (candidates.length === 0) {
    return {
      listings: [],
      insight: "No active listings match your history yet. Browse to find great accounts.",
    };
  }

  const prompt = `
You are AccsMarkets Intelligence. Given a buyer's profile and candidate listings, select the top 3-5 listings and explain why each suits this user. Return JSON ONLY.

USER PROFILE:
- Primary intent: ${user.primaryIntent ?? "buyer"}
- Past purchase platforms: ${[...new Set(user.escrowsAsBuyer.map((e) => e.listing.platform))].join(", ") || "none yet"}
- Watchlisted platforms: ${[...new Set(user.watchlist.map((w) => w.listing.platform))].join(", ") || "none"}

CANDIDATE LISTINGS (pick 3-5 best fits):
${JSON.stringify(candidates.map((c) => ({ id: c.id, title: c.title, platform: c.platform, price: Number(c.price), followers: c.followers, niche: c.niche })))}

Return:
{
  "listings": [{ "id": "...", "title": "...", "platform": "...", "price": number, "reason": "1 sentence why this fits the user" }],
  "insight": "1-2 sentence overall insight about what this user should look for"
}
`.trim();

  const fallback: Recommendations = {
    listings: candidates.slice(0, 3).map((c) => ({
      id: c.id,
      title: c.title,
      platform: c.platform,
      price: Number(c.price),
      reason: "Popular listing in a category you may like.",
    })),
    insight: "Based on your activity, these listings may interest you.",
  };

  try {
    const result = await generateWithAI(prompt, { jsonMode: true, maxTokens: 800 });
    return safeParseJSON<Recommendations>(result.text, fallback);
  } catch {
    return fallback;
  }
}

// ─── detectSuspiciousActivity ─────────────────────────────────────────────────

export async function detectSuspiciousActivity(userId: string): Promise<RiskAnalysis> {
  // Reuse the existing risk score from DB (computed by risk.ts engine)
  const riskScore = await prisma.riskScore.findUnique({
    where: { userId },
    select: { score: true, severity: true, factors: true, computedAt: true },
  });

  const securityFlags = await prisma.securityFlag.findMany({
    where: { userId, resolvedAt: null },
    select: { reason: true, severity: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const score = riskScore?.score ?? 0;
  const severity = riskScore?.severity ?? "LOW";
  // RiskScore.factors rows are written by src/lib/risk.ts as { key, label, weight, detail }.
  const factors = (riskScore?.factors as Array<{ key?: string; label?: string; detail?: string }>) ?? [];

  const riskLevel = severity === "CRITICAL" ? "critical"
    : severity === "HIGH" ? "high"
    : severity === "MEDIUM" ? "medium"
    : "low";

  const flags = [
    ...factors.map((f) => (f.label ?? f.key ?? "Risk factor") + (f.detail ? `: ${f.detail}` : "")),
    ...securityFlags.map((f) => f.reason),
  ].slice(0, 8);

  const prompt = `
You are AccsMarkets Intelligence, a fraud detection AI. Summarize the risk profile for this marketplace user. Return JSON ONLY.

RISK SCORE: ${score}/100
SEVERITY: ${severity}
FLAGS: ${flags.length > 0 ? flags.join("; ") : "None detected"}
UNRESOLVED SECURITY FLAGS: ${securityFlags.length}

Return:
{
  "riskLevel": "${riskLevel}",
  "score": ${score},
  "flags": ${JSON.stringify(flags)},
  "summary": "1-2 sentence risk summary",
  "recommendation": "1 sentence action recommendation"
}
`.trim();

  const fallback: RiskAnalysis = {
    riskLevel,
    score,
    flags,
    summary: score === 0
      ? "No suspicious activity detected. This account appears to be in good standing."
      : `This account has a risk score of ${score}/100 with ${flags.length} flag(s).`,
    recommendation: score < 25
      ? "No action required."
      : "Review flagged activity and consider contacting the user.",
  };

  try {
    const result = await generateWithAI(prompt, { jsonMode: true, maxTokens: 400 });
    return safeParseJSON<RiskAnalysis>(result.text, fallback);
  } catch {
    return fallback;
  }
}

// ─── suggestListingPrice ──────────────────────────────────────────────────────

export async function suggestListingPrice(
  platform: string,
  followers: number,
  monetized: boolean,
  niche?: string
): Promise<PricingSuggestion> {
  // Pull historical completed escrows for the same platform
  const historicalSales = await prisma.escrow.findMany({
    where: {
      status: "COMPLETED",
      listing: {
        platform: platform as Platform,
        status: "SOLD",
        monetized,
        ...(niche ? { niche } : {}),
      },
    },
    select: {
      amount: true,
      listing: {
        select: { followers: true, monetized: true, niche: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Fallback: all sales on platform regardless of filters
  const fallbackSales = historicalSales.length < 5
    ? await prisma.escrow.findMany({
        where: { status: "COMPLETED", listing: { platform: platform as Platform, status: "SOLD" } },
        select: { amount: true, listing: { select: { followers: true, monetized: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      })
    : [];

  const allSales = [...historicalSales, ...fallbackSales].slice(0, 50);

  const prices = allSales.map((s) => Number(s.amount)).filter((p) => p > 0);
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  const prompt = `
You are AccsMarkets Intelligence, a pricing expert for social media account sales.

Suggest a fair market price for this listing. Return JSON ONLY.

LISTING ATTRIBUTES:
- Platform: ${platform}
- Followers: ${followers.toLocaleString()}
- Monetized: ${monetized}
- Niche: ${niche ?? "General"}

HISTORICAL SALES DATA (${allSales.length} comparable sales):
- Average sale price: $${avgPrice.toFixed(2)}
- Price range: $${Math.min(...prices, avgPrice).toFixed(2)} – $${Math.max(...prices, avgPrice).toFixed(2)}
- Sample data: ${JSON.stringify(allSales.slice(0, 8).map((s) => ({ price: Number(s.amount), followers: s.listing.followers, monetized: s.listing.monetized })))}

Return:
{
  "suggestedPrice": number,
  "priceRange": { "min": number, "max": number },
  "confidence": "low" | "medium" | "high",
  "rationale": "2-3 sentence explanation",
  "comparables": ${allSales.length}
}
`.trim();

  // Rule-of-thumb fallback
  const basePrice = followers < 1000 ? 50
    : followers < 10000 ? 150
    : followers < 100000 ? 500
    : followers < 1000000 ? 2000
    : 10000;
  const monetizedMultiplier = monetized ? 1.5 : 1;
  const fallbackPrice = Math.round(basePrice * monetizedMultiplier);

  const fallback: PricingSuggestion = {
    suggestedPrice: avgPrice > 0 ? Math.round(avgPrice) : fallbackPrice,
    priceRange: {
      min: Math.round((avgPrice > 0 ? avgPrice : fallbackPrice) * 0.8),
      max: Math.round((avgPrice > 0 ? avgPrice : fallbackPrice) * 1.3),
    },
    confidence: allSales.length >= 10 ? "high" : allSales.length >= 3 ? "medium" : "low",
    rationale: allSales.length > 0
      ? `Based on ${allSales.length} comparable sales on ${platform}, the average price is $${avgPrice.toFixed(0)}.`
      : `No comparable sales found. Suggested price is based on follower count and platform benchmarks.`,
    comparables: allSales.length,
  };

  try {
    const result = await generateWithAI(prompt, { jsonMode: true, maxTokens: 500 });
    return safeParseJSON<PricingSuggestion>(result.text, fallback);
  } catch {
    return fallback;
  }
}

// ─── getMarketTrends ──────────────────────────────────────────────────────────

export async function getMarketTrends(): Promise<MarketTrends> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    activeListingsByPlatform,
    completedEscrows,
    recentListings,
    recentEscrows,
    totalActiveListings,
    totalCompleted,
  ] = await Promise.all([
    prisma.listing.groupBy({
      by: ["platform"],
      where: { status: "ACTIVE" },
      _count: { id: true },
      _avg: { price: true },
    }),
    prisma.escrow.findMany({
      where: { status: "COMPLETED" },
      select: { amount: true, listing: { select: { platform: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.listing.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.escrow.findMany({
      where: { status: "COMPLETED", createdAt: { gte: sevenDaysAgo } },
      select: { amount: true },
    }),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.escrow.count({ where: { status: "COMPLETED" } }),
  ]);

  // Aggregate sold counts and avg prices per platform
  const soldByPlatform: Record<string, { count: number; totalAmount: number }> = {};
  for (const e of completedEscrows) {
    const p = e.listing.platform;
    if (!soldByPlatform[p]) soldByPlatform[p] = { count: 0, totalAmount: 0 };
    soldByPlatform[p].count += 1;
    soldByPlatform[p].totalAmount += Number(e.amount);
  }

  const topPlatforms = activeListingsByPlatform
    .map((row) => ({
      platform: row.platform,
      avgPrice: Math.round(Number(row._avg.price ?? 0)),
      listingCount: row._count.id,
      soldCount: soldByPlatform[row.platform]?.count ?? 0,
    }))
    .sort((a, b) => b.listingCount - a.listingCount)
    .slice(0, 8);

  const avgPriceByPlatform: Record<string, number> = {};
  for (const row of activeListingsByPlatform) {
    avgPriceByPlatform[row.platform] = Math.round(Number(row._avg.price ?? 0));
  }

  const avgEscrowValue =
    completedEscrows.length > 0
      ? completedEscrows.reduce((sum, e) => sum + Number(e.amount), 0) / completedEscrows.length
      : 0;

  const recentEscrowAmounts = recentEscrows.map((e) => Number(e.amount));
  const avgSalePrice7d =
    recentEscrowAmounts.length > 0
      ? recentEscrowAmounts.reduce((a, b) => a + b, 0) / recentEscrowAmounts.length
      : 0;

  // AI narrative
  const prompt = `
You are AccsMarkets Intelligence. Write a 2-3 sentence market insight for a social-media-account marketplace. Return JSON ONLY.

MARKET SNAPSHOT:
- Total active listings: ${totalActiveListings}
- Total completed sales: ${totalCompleted}
- New listings (7d): ${recentListings}
- Sales (7d): ${recentEscrows.length}
- Avg sale value (7d): $${avgSalePrice7d.toFixed(0)}
- Top platforms: ${topPlatforms.slice(0, 4).map((p) => `${p.platform} (${p.listingCount} active, ${p.soldCount} sold)`).join(", ")}

Return: { "aiInsight": "..." }
`.trim();

  let aiInsight = `The marketplace currently has ${totalActiveListings} active listings across multiple platforms, with ${recentEscrows.length} sales completed in the past 7 days.`;
  try {
    const result = await generateWithAI(prompt, { jsonMode: true, maxTokens: 300 });
    const parsed = safeParseJSON<{ aiInsight?: string }>(result.text, {});
    if (parsed.aiInsight) aiInsight = parsed.aiInsight;
  } catch {
    // keep fallback
  }

  return {
    topPlatforms,
    avgPriceByPlatform,
    totalActiveListings,
    totalCompletedEscrows: totalCompleted,
    avgEscrowValue: Math.round(avgEscrowValue),
    recentActivity: {
      newListings7d: recentListings,
      completedEscrows7d: recentEscrows.length,
      avgSalePrice7d: Math.round(avgSalePrice7d),
    },
    aiInsight,
  };
}
