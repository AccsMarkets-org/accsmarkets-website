import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  analyzeListing,
  getUserRecommendations,
  detectSuspiciousActivity,
  suggestListingPrice,
  getMarketTrends,
} from "@/lib/intelligence";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/intelligence?action=recommendations
// GET /api/intelligence?action=trends
// GET /api/intelligence?action=risk  (own account)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed: getAllowed } = await checkRateLimit(`ai-intelligence:${session.user.id}`, 20, 3600);
  if (!getAllowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    if (action === "recommendations") {
      const data = await getUserRecommendations(session.user.id);
      return NextResponse.json({ data });
    }

    if (action === "trends") {
      const data = await getMarketTrends();
      return NextResponse.json({ data });
    }

    if (action === "risk") {
      const data = await detectSuspiciousActivity(session.user.id);
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Unknown action. Use ?action=recommendations|trends|risk" }, { status: 400 });
  } catch (err) {
    console.error("[intelligence GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Intelligence service error" },
      { status: 500 }
    );
  }
}

// POST /api/intelligence
// body: { listingId }       → listing analysis
// body: { platform, followers, monetized, niche? } → price suggestion
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed: postAllowed } = await checkRateLimit(`ai-intelligence:${session.user.id}`, 20, 3600);
  if (!postAllowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // Listing analysis
    if (typeof body.listingId === "string") {
      const data = await analyzeListing(body.listingId);
      return NextResponse.json({ data });
    }

    // Price suggestion
    const VALID_PLATFORMS = ["YOUTUBE","INSTAGRAM","TIKTOK","FACEBOOK","TELEGRAM","TWITTER_X","SNAPCHAT","PINTEREST","LINKEDIN","WEBSITE"];
    if (typeof body.platform === "string" && typeof body.followers === "number") {
      if (!VALID_PLATFORMS.includes(body.platform)) {
        return NextResponse.json({ error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(", ")}` }, { status: 400 });
      }
      const data = await suggestListingPrice(
        body.platform,
        body.followers,
        Boolean(body.monetized),
        typeof body.niche === "string" ? body.niche : undefined
      );
      return NextResponse.json({ data });
    }

    return NextResponse.json(
      { error: "Provide either { listingId } or { platform, followers, monetized }" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[intelligence POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Intelligence service error" },
      { status: 500 }
    );
  }
}
