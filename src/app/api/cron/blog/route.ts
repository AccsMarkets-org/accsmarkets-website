import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateWithAI } from "@/lib/ai";
import { sanitizeHtml } from "@/lib/sanitize";
import { BLOG_SYSTEM_PROMPT, buildBlogPrompt } from "@/lib/blog-prompt";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

// Default topics used when the queue is empty
const DEFAULT_TOPICS = [
  "How to safely buy social media accounts online",
  "Top platforms to sell your Instagram account in 2025",
  "What to look for when buying a YouTube channel",
  "Escrow services explained: how they protect you in account sales",
  "How to value a Twitter/X account before selling",
  "5 mistakes to avoid when buying aged social media accounts",
  "TikTok account flipping: complete beginner guide",
  "How to verify a social media account before purchase",
];

export async function POST(req: Request) {
  // Verify cron secret
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check auto-publish setting from env
  const autoPublish = process.env.BLOG_AUTO_PUBLISH === "true";

  // Pick topic: first pending queue item, or a random default
  let topic: string;
  let queueItemId: string | null = null;

  const queueItem = await prisma.blogTopicQueue.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });

  if (queueItem) {
    topic = queueItem.prompt;
    queueItemId = queueItem.id;
    await prisma.blogTopicQueue.update({ where: { id: queueItem.id }, data: { status: "GENERATING" } });
  } else {
    topic = DEFAULT_TOPICS[Math.floor(Math.random() * DEFAULT_TOPICS.length)];
  }

  let postId: string | null = null;
  let success = false;
  let errorMsg: string | null = null;
  let tokensIn = 0, tokensOut = 0;

  try {
    const fullPrompt = buildBlogPrompt(topic);

    const result = await generateWithAI(fullPrompt, { jsonMode: true, systemPrompt: BLOG_SYSTEM_PROMPT });
    tokensIn = result.tokensIn;
    tokensOut = result.tokensOut;

    let jsonText = result.text;
    // Strip markdown code block wrapper (Groq/Llama often wraps with ```json ... ```)
    const codeBlock = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonText = codeBlock[1];

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");

    let cleanJson = jsonMatch[0];
    let parsed: { title: string; excerpt: string; content: string; tags: string; keywords?: string[] };
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      // Fix unescaped literal newlines inside JSON string values
      cleanJson = cleanJson.replace(/\r\n/g, "\\n").replace(/\r/g, "\\n").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
      parsed = JSON.parse(cleanJson);
    }

    const baseSlug = slugify(parsed.title ?? topic);
    let slug = baseSlug;
    let attempt = 0;
    while (await prisma.blogPost.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++attempt}`;
    }

    const post = await prisma.blogPost.create({
      data: {
        slug,
        title: parsed.title,
        excerpt: parsed.excerpt ?? "",
        content: sanitizeHtml(parsed.content),
        tags: parsed.keywords?.join(", ") || parsed.tags || "",
        status: autoPublish ? "PUBLISHED" : "DRAFT",
        isAiGen: true,
        publishedAt: autoPublish ? new Date() : null,
      },
    });
    postId = post.id;
    success = true;
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "Unknown error";
  }

  if (queueItemId) {
    await prisma.blogTopicQueue.update({
      where: { id: queueItemId },
      data: { status: success ? "DONE" : "FAILED", blogPostId: postId, processedAt: new Date() },
    });
  }

  await prisma.blogAutomationLog.create({
    data: { prompt: topic, postId, success, error: errorMsg, tokensIn, tokensOut },
  });

  if (!success) return NextResponse.json({ error: errorMsg }, { status: 500 });
  return NextResponse.json({ ok: true, postId, autoPublished: autoPublish });
}
