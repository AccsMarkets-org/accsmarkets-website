import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { generateWithAI } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireAdmin("MANAGE_BLOG");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const seed = searchParams.get("seed") ?? "";

  // Get recent post titles to avoid duplicates
  const recentPosts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { title: true },
  });
  const recentTitles = recentPosts.map((p) => p.title).join("\n- ");

  const seedLine = seed ? `\nFocus especially on: ${seed}` : "";
  const avoidLine = recentTitles
    ? `\n\nAvoid repeating these recently covered topics:\n- ${recentTitles}`
    : "";

  const prompt = `You are a content strategist for AccsMarkets — a marketplace where people buy and sell social media accounts (Instagram, TikTok, YouTube, Twitter/X, Facebook, Discord, Telegram, etc.).

Generate exactly 10 compelling, SEO-friendly blog topic ideas that would attract buyers and sellers of social media accounts.${seedLine}

Topics should cover: buying guides, selling tips, account safety, platform-specific advice, pricing strategies, scam prevention, account valuation, niche account types, marketplace trends, and success stories.${avoidLine}

Respond with JSON only — no extra text:
{
  "topics": [
    { "title": "...", "category": "buying|selling|safety|guide|trend", "seoScore": 8 },
    ...10 items...
  ]
}`;

  try {
    const result = await generateWithAI(prompt);

    let jsonText = result.text;
    const codeBlock = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonText = codeBlock[1];
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]) as {
      topics: Array<{ title: string; category: string; seoScore: number }>;
    };

    return NextResponse.json({ topics: parsed.topics, provider: result.provider });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI generation failed" },
      { status: 500 }
    );
  }
}
