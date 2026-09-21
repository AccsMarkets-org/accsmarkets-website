import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { submitToIndexNow } from "@/lib/indexnow";

// AutoSEO (https://getautoseo.com) article webhook.
// Receives article.published / article.updated events and upserts them into the
// existing BlogPost table so they render at /blog/<slug>. A NEW table
// (AutoSeoArticle) maps the external AutoSEO id -> BlogPost and stores the extra
// metadata. No existing tables/columns/data are altered or deleted.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.AUTOSEO_WEBHOOK_SECRET;
const BASE_URL = (process.env.NEXTAUTH_URL ?? "https://accsmarkets.org").replace(/\/$/, "");

// ── New mapping/storage table (created lazily, once per process) ──────────────
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS \`AutoSeoArticle\` (
  \`autoSeoId\` INT NOT NULL,
  \`blogPostId\` VARCHAR(191) NOT NULL,
  \`slug\` VARCHAR(191) NOT NULL,
  \`languageCode\` VARCHAR(16) NULL,
  \`sourceArticleId\` INT NULL,
  \`publishedUrl\` TEXT NULL,
  \`metaDescription\` TEXT NULL,
  \`metaKeywords\` TEXT NULL,
  \`keywords\` TEXT NULL,
  \`faqSchema\` LONGTEXT NULL,
  \`contentHtml\` LONGTEXT NULL,
  \`contentMarkdown\` LONGTEXT NULL,
  \`heroImageUrl\` TEXT NULL,
  \`heroImageLocal\` TEXT NULL,
  \`heroImageAlt\` TEXT NULL,
  \`infographicImageUrl\` TEXT NULL,
  \`infographicImageLocal\` TEXT NULL,
  \`deliveryId\` VARCHAR(191) NULL,
  \`rawPayload\` LONGTEXT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`autoSeoId\`),
  INDEX \`idx_autoseo_blogpost\` (\`blogPostId\`),
  INDEX \`idx_autoseo_slug\` (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

let tableReady: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = prisma
      .$executeRawUnsafe(CREATE_TABLE_SQL)
      .then(() => undefined)
      .catch((e) => {
        tableReady = null; // allow retry on next request
        throw e;
      });
  }
  return tableReady;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function cleanSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-_]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extFromContentType(ct: string): string | null {
  const map: Record<string, string> = {
    "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
    "image/webp": "webp", "image/gif": "gif", "image/avif": "avif", "image/svg+xml": "svg",
  };
  return map[ct.split(";")[0].trim().toLowerCase()] ?? null;
}

// Download a remote image and store it locally under /public/blog-images so we
// never hotlink. Returns the public path (e.g. "/blog-images/autoseo-5-hero.jpg")
// or null on any failure.
// Block private / loopback / link-local hosts to reduce SSRF (e.g. cloud metadata at 169.254.169.254).
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h === "0.0.0.0") return true;
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    if (a === 0 || a === 127 || a === 10) return true;
    if (a === 169 && b === 254) return true;             // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;    // private
    if (a === 192 && b === 168) return true;             // private
    if (a === 100 && b >= 64 && b <= 127) return true;   // CGNAT
  }
  return false;
}

async function downloadImage(url: string | null | undefined, destBase: string): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (isBlockedHost(parsed.hostname)) return null;
  try {
    // Manually follow up to 2 redirects, re-validating each target host so a
    // public URL can't 30x-redirect into an internal one — while still working
    // with legitimate CDN redirects.
    let current = url;
    let res: Response | null = null;
    for (let hop = 0; hop < 3; hop++) {
      const r = await fetch(current, { signal: AbortSignal.timeout(20000), redirect: "manual" });
      if (r.status >= 300 && r.status < 400) {
        const loc = r.headers.get("location");
        if (!loc) return null;
        const next = new URL(loc, current);
        if ((next.protocol !== "http:" && next.protocol !== "https:") || isBlockedHost(next.hostname)) return null;
        current = next.toString();
        continue;
      }
      res = r;
      break;
    }
    if (!res || !res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.toLowerCase().startsWith("image/")) return null;
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len && len > 20 * 1024 * 1024) return null; // 20MB cap
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > 20 * 1024 * 1024) return null;
    const ext = extFromContentType(ct) ?? (url.split("?")[0].match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? "jpg").toLowerCase();
    // Store OUTSIDE public/ — Next doesn't serve runtime-added public files.
    // Served back via the /blog-images/[file] route handler.
    const dir = path.join(process.cwd(), "storage", "blog-images");
    await fs.mkdir(dir, { recursive: true });
    const filename = `${destBase}.${ext}`;
    await fs.writeFile(path.join(dir, filename), buf);
    return `/api/blog-images/${filename}`;
  } catch {
    return null;
  }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!SECRET) return NextResponse.json({ error: "Webhook not configured" }, { status: 401 });

  // Read the RAW body first — needed for HMAC verification (must not re-serialize).
  const rawBody = await req.text();

  // Auth: accept EITHER a valid Bearer token OR a valid HMAC signature — both
  // derive from the shared secret. AutoSEO may send one or the other, and
  // providers format signatures differently (hex/base64, "sha256=" prefix), so
  // requiring the Bearer AND strictly matching the signature rejected legit
  // deliveries. We authenticate if either check passes; reject only if neither.
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const bearerOk = token.length > 0 && safeEqual(token, SECRET);

  const sigHeader = (req.headers.get("x-autoseo-signature") ?? "").trim();
  let sigOk = false;
  if (sigHeader) {
    const provided = sigHeader.replace(/^sha256=/i, "").trim();
    const expectedHex = crypto.createHmac("sha256", SECRET).update(rawBody, "utf8").digest("hex");
    const expectedB64 = crypto.createHmac("sha256", SECRET).update(rawBody, "utf8").digest("base64");
    sigOk =
      safeEqual(provided.toLowerCase(), expectedHex.toLowerCase()) ||
      safeEqual(provided, expectedB64);
    if (!sigOk) {
      console.warn("[autoseo] sig mismatch", { providedHead: provided.slice(0, 12), expectedHexHead: expectedHex.slice(0, 12) });
    }
  }

  if (!bearerOk && !sigOk) {
    console.warn("[autoseo] 401", { hasAuthHeader: Boolean(authHeader), bearerOk, sigPresent: Boolean(sigHeader), sigOk });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse JSON (after signature check, from the same raw body)
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const event = String(body.event ?? "");

  // 3) test event — acknowledge without creating anything
  if (event === "test") {
    return NextResponse.json({ url: `${BASE_URL}/test` }, { status: 200 });
  }

  // Only publish/update events create content; acknowledge anything else so it isn't retried.
  if (event !== "article.published" && event !== "article.updated") {
    return NextResponse.json({ ok: true, ignored: event }, { status: 200 });
  }

  const autoSeoId = Number(body.id);
  if (!Number.isInteger(autoSeoId)) {
    return NextResponse.json({ error: "Missing or invalid article id" }, { status: 400 });
  }

  try {
    await ensureTable();

    const deliveryId = req.headers.get("x-autoseo-delivery") ?? null;
    const title = String(body.title ?? "Untitled");
    const contentHtml = typeof body.content_html === "string" ? body.content_html : "";
    const contentMarkdown = typeof body.content_markdown === "string" ? body.content_markdown : "";
    const metaDescription = typeof body.metaDescription === "string" ? body.metaDescription : "";
    const metaKeywords = typeof body.metaKeywords === "string" ? body.metaKeywords : null;
    const keywords = Array.isArray(body.keywords) ? (body.keywords as unknown[]).map(String) : [];
    const faqSchema = Array.isArray(body.faqSchema) ? body.faqSchema : null;
    const languageCode = typeof body.languageCode === "string" ? body.languageCode : null;
    const sourceArticleId = Number.isInteger(body.sourceArticleId as number) ? (body.sourceArticleId as number) : null;
    const publishedUrl = typeof body.published_url === "string" ? body.published_url : null;
    const heroImageAlt = typeof body.heroImageAlt === "string" ? body.heroImageAlt : null;

    const publishedAt = body.publishedAt ? new Date(String(body.publishedAt)) : new Date();
    const validPublishedAt = isNaN(publishedAt.getTime()) ? new Date() : publishedAt;

    // Find any existing mapping for this AutoSEO id.
    const mappingRows = await prisma.$queryRawUnsafe<{ blogPostId: string }[]>(
      "SELECT `blogPostId` FROM `AutoSeoArticle` WHERE `autoSeoId` = ? LIMIT 1",
      autoSeoId,
    );
    let blogPostId: string | null = mappingRows[0]?.blogPostId ?? null;

    // Confirm the linked post still exists (it may have been removed).
    if (blogPostId) {
      const exists = await prisma.blogPost.findUnique({ where: { id: blogPostId }, select: { id: true } });
      if (!exists) blogPostId = null;
    }

    // Resolve a unique, stable slug.
    let baseSlug = cleanSlug(String(body.slug ?? "")) || cleanSlug(title) || `article-${autoSeoId}`;
    let finalSlug = baseSlug;
    const clash = await prisma.blogPost.findUnique({ where: { slug: finalSlug }, select: { id: true } });
    if (clash && clash.id !== blogPostId) {
      finalSlug = `${baseSlug}-${autoSeoId}`;
    }

    // Download images locally (never hotlink). Failures degrade gracefully to null.
    const [heroLocal, infoLocal] = await Promise.all([
      downloadImage(body.heroImageUrl as string | null, `autoseo-${autoSeoId}-hero`),
      downloadImage(body.infographicImageUrl as string | null, `autoseo-${autoSeoId}-info`),
    ]);

    const excerpt =
      (metaDescription || stripTags(contentHtml).slice(0, 300) || title).slice(0, 1000) || title;
    const content = contentHtml || contentMarkdown || "";
    const tags = keywords.length ? keywords.join(", ") : metaKeywords;

    const postData = {
      slug: finalSlug,
      title,
      excerpt,
      content,
      coverImage: heroLocal, // local path or null — never the remote URL
      status: "PUBLISHED" as const,
      tags: tags ?? null,
      isAiGen: true,
      publishedAt: validPublishedAt,
    };

    // Upsert the BlogPost (update the linked one, else create a new one).
    if (blogPostId) {
      await prisma.blogPost.update({ where: { id: blogPostId }, data: postData });
    } else {
      const created = await prisma.blogPost.create({ data: postData });
      blogPostId = created.id;
    }

    // Upsert the AutoSEO mapping/metadata row (keyed on autoSeoId).
    await prisma.$executeRawUnsafe(
      "INSERT INTO `AutoSeoArticle` " +
        "(`autoSeoId`,`blogPostId`,`slug`,`languageCode`,`sourceArticleId`,`publishedUrl`,`metaDescription`,`metaKeywords`,`keywords`,`faqSchema`,`contentHtml`,`contentMarkdown`,`heroImageUrl`,`heroImageLocal`,`heroImageAlt`,`infographicImageUrl`,`infographicImageLocal`,`deliveryId`,`rawPayload`,`updatedAt`) " +
        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(3)) " +
        "ON DUPLICATE KEY UPDATE " +
        "`blogPostId`=VALUES(`blogPostId`),`slug`=VALUES(`slug`),`languageCode`=VALUES(`languageCode`),`sourceArticleId`=VALUES(`sourceArticleId`),`publishedUrl`=VALUES(`publishedUrl`),`metaDescription`=VALUES(`metaDescription`),`metaKeywords`=VALUES(`metaKeywords`),`keywords`=VALUES(`keywords`),`faqSchema`=VALUES(`faqSchema`),`contentHtml`=VALUES(`contentHtml`),`contentMarkdown`=VALUES(`contentMarkdown`),`heroImageUrl`=VALUES(`heroImageUrl`),`heroImageLocal`=VALUES(`heroImageLocal`),`heroImageAlt`=VALUES(`heroImageAlt`),`infographicImageUrl`=VALUES(`infographicImageUrl`),`infographicImageLocal`=VALUES(`infographicImageLocal`),`deliveryId`=VALUES(`deliveryId`),`rawPayload`=VALUES(`rawPayload`),`updatedAt`=NOW(3)",
      autoSeoId,
      blogPostId,
      finalSlug,
      languageCode,
      sourceArticleId,
      publishedUrl,
      metaDescription || null,
      metaKeywords,
      keywords.length ? JSON.stringify(keywords) : null,
      faqSchema ? JSON.stringify(faqSchema) : null,
      contentHtml || null,
      contentMarkdown || null,
      (body.heroImageUrl as string) ?? null,
      heroLocal,
      heroImageAlt,
      (body.infographicImageUrl as string) ?? null,
      infoLocal,
      deliveryId,
      rawBody.slice(0, 1_000_000),
    );

    const publicUrl = `${BASE_URL}/blog/${finalSlug}`;

    // Tell search engines about the new/updated URL (fire-and-forget).
    submitToIndexNow([publicUrl]).catch(() => {});

    return NextResponse.json({ url: publicUrl }, { status: 200 });
  } catch (err) {
    // Return 500 so AutoSEO retries the delivery.
    console.error("[autoseo webhook]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
