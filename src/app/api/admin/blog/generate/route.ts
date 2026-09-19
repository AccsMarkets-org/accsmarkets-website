import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { generateWithAI } from "@/lib/ai";
import { sanitizeHtml } from "@/lib/sanitize";
import { BLOG_SYSTEM_PROMPT, buildBlogPrompt } from "@/lib/blog-prompt";

export const dynamic = "force-dynamic";

const schema = z.object({
  prompt: z.string().trim().min(10).max(500),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * AI responses are often pretty-printed JSON with raw newlines inside string
 * values (e.g. multi-paragraph HTML in "content"), which is invalid JSON.
 * Escaping every \n/\r/\t blindly also corrupts the *structural* whitespace
 * between tokens (a bare backslash outside a string is illegal JSON). This
 * walks the text tracking quote/escape state and only escapes control
 * characters that fall inside a string literal.
 */
function escapeControlCharsInJsonStrings(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
      } else if (ch === "\\") {
        out += ch;
        escaped = true;
      } else if (ch === '"') {
        out += ch;
        inString = false;
      } else if (ch === "\n") {
        out += "\\n";
      } else if (ch === "\r") {
        out += "\\r";
      } else if (ch === "\t") {
        out += "\\t";
      } else {
        out += ch;
      }
    } else {
      out += ch;
      if (ch === '"') inString = true;
    }
  }
  return out;
}

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_BLOG");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Prompt is required (10–500 chars)." }, { status: 400 });

  const topic = await prisma.blogTopicQueue.create({
    data: { prompt: parsed.data.prompt, status: "GENERATING" },
  });

  let postId: string | null = null;
  let success = false;
  let error: string | null = null;
  let tokensIn = 0, tokensOut = 0;

  try {
    const fullPrompt = buildBlogPrompt(parsed.data.prompt);

    const result = await generateWithAI(fullPrompt, { jsonMode: true, systemPrompt: BLOG_SYSTEM_PROMPT });
    tokensIn  = result.tokensIn;
    tokensOut = result.tokensOut;

    // Extract JSON from the response (sometimes wrapped in a ```json block)
    let jsonText = result.text;

    // Remove markdown code block wrapper if present
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1];
    }

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response.");

    // AI JSON often has raw newlines inside string values (invalid JSON) —
    // try as-is first, then fall back to a string-aware control-char escape.
    const cleanJson = jsonMatch[0];
    let parsed2: { title: string; excerpt: string; content: string; tags: string; keywords?: string[] };
    try {
      parsed2 = JSON.parse(cleanJson);
    } catch {
      parsed2 = JSON.parse(escapeControlCharsInJsonStrings(cleanJson));
    }

    // Some models ignore the "content goes inside the JSON" instruction and
    // instead write the full article as plain text BEFORE the JSON block,
    // leaving "content" as a short placeholder (e.g. "...(above content)").
    // Detect that and recover the real article from the text preceding the
    // JSON rather than silently publishing a near-empty post.
    const MIN_CONTENT_LENGTH = 300;
    if (!parsed2.content || parsed2.content.trim().length < MIN_CONTENT_LENGTH) {
      const preJsonText = jsonText.slice(0, jsonMatch.index).trim();
      if (preJsonText.length >= MIN_CONTENT_LENGTH) {
        parsed2.content = preJsonText;
      } else {
        throw new Error(
          `AI response content field too short (${parsed2.content?.length ?? 0} chars) and no usable article text found outside the JSON.`
        );
      }
    }

    const baseSlug = slugify(parsed2.title ?? parsed.data.prompt);
    let slug = baseSlug;
    let attempt = 0;
    while (await prisma.blogPost.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++attempt}`;
    }

    const post = await prisma.blogPost.create({
      data: {
        slug,
        title:    parsed2.title,
        excerpt:  parsed2.excerpt ?? "",
        content:  sanitizeHtml(parsed2.content),
        tags:     parsed2.keywords?.join(", ") || parsed2.tags || "",
        status:   "PUBLISHED",
        isAiGen:  true,
        publishedAt: new Date(),
      },
    });
    postId  = post.id;
    success = true;
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  await prisma.blogTopicQueue.update({
    where: { id: topic.id },
    data: { status: success ? "DONE" : "FAILED", blogPostId: postId, processedAt: new Date() },
  });
  await prisma.blogAutomationLog.create({
    data: { prompt: parsed.data.prompt, postId, success, error, tokensIn, tokensOut },
  });

  if (!success) return NextResponse.json({ error: `Generation failed: ${error}` }, { status: 500 });
  return NextResponse.json({ postId }, { status: 201 });
}
