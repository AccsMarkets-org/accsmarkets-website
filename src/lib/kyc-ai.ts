/**
 * KYC document analysis (phase 1) — vision-LLM assisted OCR + quality checks.
 *
 * What this does:
 *   - Fetches the submitted ID front / ID back / selfie from our own storage
 *     hosts only, downsizes them, and sends them to a vision-capable provider
 *     via `generateWithAI({ images, jsonOnly })`.
 *   - Extracts OCR fields (name, DOB, document number, expiry), document type
 *     and country, an image-quality estimate, tamper suspicion, and whether a
 *     face is visible on the ID / exactly one face is in the selfie.
 *   - Computes a deterministic `kycScore` (0-100) from those signals.
 *
 * What this deliberately does NOT do:
 *   - No face-similarity number and no liveness verdict. An LLM "guess" for
 *     either is not a biometric comparison and would mislead reviewers, so
 *     `faceSimilarity` and `isLive` stay null until a real face-match /
 *     liveness provider is integrated (phase 2). Nothing is auto-approved.
 *
 * Privacy: image bytes and extracted PII are never logged — only the score
 * and machine-readable note codes are.
 */

import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateWithAI, isVisionAvailable, type AIImage } from "@/lib/ai";
import { resignKycUrl } from "@/lib/cloudinary";
import { decryptKycField, encryptKycField, isEncryptedKycField } from "@/lib/kyc-encrypt";
import { emitToAdmins } from "@/lib/socket";
import { createNotification } from "@/lib/notifications";

// ── Public types ──────────────────────────────────────────────────────────────

export type KycDocumentType = "passport" | "id_card" | "driver_license" | "other";

export interface KycAiResult {
  ocrName?: string;
  ocrDob?: string;
  ocrDocNumber?: string;
  ocrExpiry?: string;
  documentType?: KycDocumentType;
  documentCountry?: string;
  /** 0-100 legibility / framing / lighting estimate */
  quality: number;
  tamperSuspected: boolean;
  faceVisibleOnId: boolean;
  selfieHasSingleFace: boolean;
  /** 0-100 composite score (see `scoreKyc`) */
  kycScore: number;
  /** Machine-readable codes first (e.g. "ai_unparseable"), then short model remarks */
  notes: string[];
  /** Which provider answered, when one did */
  provider?: string;
}

export interface KycDocumentUrls {
  idFrontUrl: string;
  idBackUrl?: string | null;
  selfieUrl: string;
}

// ── Host allowlist ────────────────────────────────────────────────────────────

/** Hosts our own uploaders produce. Anything else is refused outright. */
export const KYC_ALLOWED_HOSTS = [
  "res.cloudinary.com",
  "api.cloudinary.com",
  "lh3.googleusercontent.com",
  "drive.google.com",
] as const;

export function isAllowedKycUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return (KYC_ALLOWED_HOSTS as readonly string[]).includes(u.hostname);
  } catch {
    return false;
  }
}

// Drive links redirect to *.googleusercontent.com; accept that for the *final* hop only.
function isAllowedFinalHost(hostname: string): boolean {
  return (KYC_ALLOWED_HOSTS as readonly string[]).includes(hostname) || hostname.endsWith(".googleusercontent.com");
}

// ── Image fetching ────────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const FETCH_TIMEOUT_MS = 15_000;
const MAX_EDGE_PX = 1600;

function sniffImageMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

/** Downscale + re-encode as JPEG to keep multimodal payloads small. Falls back to the original bytes. */
async function normalizeImage(buf: Buffer, mime: string): Promise<AIImage> {
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(buf, { failOn: "none" })
      .rotate() // honour EXIF orientation so text reads upright
      .resize({ width: MAX_EDGE_PX, height: MAX_EDGE_PX, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { mimeType: "image/jpeg", base64: out.toString("base64") };
  } catch {
    return { mimeType: mime, base64: buf.toString("base64") };
  }
}

async function fetchKycImage(url: string): Promise<AIImage> {
  if (!isAllowedKycUrl(url)) throw new Error("kyc image host not allowed");

  // Signed Cloudinary links expire; mint a fresh one so re-runs days later still work.
  const liveUrl = resignKycUrl(url);

  const res = await fetch(liveUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Accept: "image/*" },
  });
  if (!res.ok) throw new Error(`kyc image fetch failed (${res.status})`);

  try {
    if (!isAllowedFinalHost(new URL(res.url || liveUrl).hostname)) throw new Error("kyc image redirected off-allowlist");
  } catch (e) {
    if (e instanceof Error && e.message.includes("off-allowlist")) throw e;
  }

  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_IMAGE_BYTES) throw new Error("kyc image too large");

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error("kyc image empty");
  if (buf.length > MAX_IMAGE_BYTES) throw new Error("kyc image too large");

  const headerMime = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const mime = sniffImageMime(buf) ?? (headerMime.startsWith("image/") ? headerMime : null);
  if (!mime) throw new Error("kyc file is not an image");

  return normalizeImage(buf, mime);
}

// ── Prompt + response schema ──────────────────────────────────────────────────

const PROMPT = `You are assisting a compliance reviewer with a Know-Your-Customer (KYC) document check.
You will receive up to three photos in this order:
  Image 1 = FRONT of a government-issued identity document
  Image 2 = BACK of the same document (may be absent)
  Image 3 = SELFIE of the applicant (they may be holding the document)

Extract what is printed on the document and assess image quality. Do NOT guess: if a field is not clearly legible, use null.
Do NOT attempt to judge whether the selfie matches the document photo, and do NOT judge liveness — those are handled elsewhere.

Respond with ONE JSON object, no markdown, exactly these keys:
{
  "ocrName": string|null,            // full name exactly as printed (Latin transliteration if provided on the document)
  "ocrDob": string|null,             // date of birth, ISO format YYYY-MM-DD
  "ocrDocNumber": string|null,       // document / passport / licence number as printed
  "ocrExpiry": string|null,          // expiry date, ISO format YYYY-MM-DD; null if none printed
  "documentType": "passport"|"id_card"|"driver_license"|"other",
  "documentCountry": string|null,    // issuing country, ISO 3166-1 alpha-2 (e.g. "US", "NG", "DE")
  "quality": number,                 // 0-100: legibility, focus, lighting, whole document in frame, no heavy glare
  "tamperSuspected": boolean,        // true if you see signs of editing, pasted text/photo, mismatched fonts, screen re-photograph, or a printed copy
  "tamperReasons": string[],         // short reasons (empty if none); never include personal data here
  "faceVisibleOnId": boolean,        // a portrait photo is clearly visible on the document front
  "selfieHasSingleFace": boolean,    // exactly one real human face is visible in the selfie
  "notes": string[]                  // up to 5 short reviewer remarks about the images themselves; never repeat personal data
}`;

function toBool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "yes") return true;
    if (s === "false" || s === "no") return false;
  }
  if (typeof v === "number") return v !== 0;
  return null;
}

const bool = z.preprocess(toBool, z.boolean().nullable());
const str = z.preprocess((v) => (typeof v === "string" ? v : v == null ? null : String(v)), z.string().nullable());
const num = z.preprocess((v) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : null), z.number().finite().nullable());
const strList = z.preprocess((v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []), z.array(z.string()));

const RawSchema = z.object({
  ocrName: str.optional(),
  ocrDob: str.optional(),
  ocrDocNumber: str.optional(),
  ocrExpiry: str.optional(),
  documentType: str.optional(),
  documentCountry: str.optional(),
  quality: num.optional(),
  tamperSuspected: bool.optional(),
  tamperReasons: strList.optional(),
  faceVisibleOnId: bool.optional(),
  selfieHasSingleFace: bool.optional(),
  notes: strList.optional(),
}).passthrough();

const NULLISH = new Set(["", "null", "none", "n/a", "na", "unknown", "not visible", "illegible", "not legible"]);

function cleanField(v: string | null | undefined, max: number): string | undefined {
  if (!v) return undefined;
  const t = v.replace(/\s+/g, " ").trim();
  if (!t || NULLISH.has(t.toLowerCase())) return undefined;
  return t.slice(0, max);
}

function cleanDate(v: string | null | undefined): string | undefined {
  const t = cleanField(v, 32);
  if (!t) return undefined;
  // Accept ISO; otherwise keep the literal (admin still sees it) but don't treat it as parseable.
  return t;
}

function cleanDocType(v: string | null | undefined): KycDocumentType | undefined {
  const t = (v ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  if (t === "passport") return "passport";
  if (t === "id_card" || t === "national_id" || t === "identity_card") return "id_card";
  if (t === "driver_license" || t === "drivers_license" || t === "driving_licence" || t === "driver_licence") return "driver_license";
  if (t) return "other";
  return undefined;
}

function cleanCountry(v: string | null | undefined): string | undefined {
  const t = cleanField(v, 8)?.toUpperCase();
  return t && /^[A-Z]{2}$/.test(t) ? t : undefined;
}

function cleanRemarks(list: string[] | undefined, max: number): string[] {
  return (list ?? [])
    .map((s) => s.replace(/\s+/g, " ").trim().slice(0, 140))
    .filter(Boolean)
    .slice(0, max);
}

function extractJson(text: string): unknown {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(t.slice(start, end + 1)); } catch { /* fall through */ }
  }
  return null;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

/**
 * kycScore (0-100) =
 *   legible fields present (40): name 15 + DOB 10 + doc number 10 + expiry 5
 * + image quality       (30): quality/100 * 30
 * + no tamper suspicion (20)
 * + face visible on ID  (10)
 */
export function scoreKyc(r: Omit<KycAiResult, "kycScore" | "notes" | "provider">): number {
  const fields = (r.ocrName ? 15 : 0) + (r.ocrDob ? 10 : 0) + (r.ocrDocNumber ? 10 : 0) + (r.ocrExpiry ? 5 : 0);
  const quality = Math.round((Math.max(0, Math.min(100, r.quality)) / 100) * 30);
  const tamper = r.tamperSuspected ? 0 : 20;
  const face = r.faceVisibleOnId ? 10 : 0;
  return Math.max(0, Math.min(100, fields + quality + tamper + face));
}

const UNPARSEABLE: KycAiResult = {
  quality: 0,
  tamperSuspected: false,
  faceVisibleOnId: false,
  selfieHasSingleFace: false,
  kycScore: 0,
  notes: ["ai_unparseable"],
};

// ── Main analysis ─────────────────────────────────────────────────────────────

export async function analyzeKycDocuments(urls: KycDocumentUrls): Promise<KycAiResult> {
  if (!isVisionAvailable()) return { ...UNPARSEABLE, notes: ["vision_unavailable"] };

  // Fetch images (front + selfie required; back optional).
  const images: AIImage[] = [];
  const notes: string[] = [];
  let hasBack = false;
  try {
    images.push(await fetchKycImage(urls.idFrontUrl));
  } catch (e) {
    return { ...UNPARSEABLE, notes: ["id_front_unfetchable", ...(e instanceof Error ? [e.message.slice(0, 80)] : [])] };
  }
  if (urls.idBackUrl) {
    try { images.push(await fetchKycImage(urls.idBackUrl)); hasBack = true; }
    catch { notes.push("id_back_unfetchable"); }
  }
  try {
    images.push(await fetchKycImage(urls.selfieUrl));
  } catch (e) {
    return { ...UNPARSEABLE, notes: ["selfie_unfetchable", ...(e instanceof Error ? [e.message.slice(0, 80)] : [])] };
  }

  const prompt = hasBack
    ? PROMPT
    : PROMPT.replace("Image 2 = BACK of the same document (may be absent)\n  Image 3 = SELFIE", "Image 2 = SELFIE") + "\n(No back-of-document image was provided.)";

  let text: string;
  let provider: string | undefined;
  try {
    const res = await generateWithAI(prompt, { images, jsonOnly: true, maxTokens: 1024 });
    text = res.text;
    provider = res.provider;
  } catch (e) {
    console.warn("[kyc-ai] provider call failed:", e instanceof Error ? e.message.split("\n")[0].slice(0, 200) : "unknown");
    return { ...UNPARSEABLE, notes: ["ai_provider_failed", ...notes] };
  }

  const raw = extractJson(text);
  const parsed = raw ? RawSchema.safeParse(raw) : null;
  if (!parsed || !parsed.success) return { ...UNPARSEABLE, notes: ["ai_unparseable", ...notes], provider };
  const d = parsed.data;

  const base = {
    ocrName: cleanField(d.ocrName, 120),
    ocrDob: cleanDate(d.ocrDob),
    ocrDocNumber: cleanField(d.ocrDocNumber, 64),
    ocrExpiry: cleanDate(d.ocrExpiry),
    documentType: cleanDocType(d.documentType),
    documentCountry: cleanCountry(d.documentCountry),
    quality: Math.max(0, Math.min(100, Math.round(d.quality ?? 0))),
    tamperSuspected: d.tamperSuspected ?? false,
    faceVisibleOnId: d.faceVisibleOnId ?? false,
    selfieHasSingleFace: d.selfieHasSingleFace ?? false,
  };

  // Coded notes (safe to log) — derived from our own checks.
  if (base.tamperSuspected) notes.push("tamper_suspected");
  if (!base.faceVisibleOnId) notes.push("no_face_on_id");
  if (!base.selfieHasSingleFace) notes.push("selfie_face_issue");
  if (base.quality < 40) notes.push("low_quality");
  if (!base.ocrName && !base.ocrDocNumber) notes.push("fields_illegible");
  if (base.ocrExpiry && /^\d{4}-\d{2}-\d{2}$/.test(base.ocrExpiry)) {
    const exp = new Date(`${base.ocrExpiry}T00:00:00Z`);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) notes.push("document_expired");
  }
  if (base.documentType) notes.push(`doc_${base.documentType}`);
  if (base.documentCountry) notes.push(`country_${base.documentCountry}`);

  // Free-text model remarks come last; they are NOT logged.
  const remarks = [...cleanRemarks(d.tamperReasons, 3), ...cleanRemarks(d.notes, 5)];

  const kycScore = scoreKyc(base);
  return { ...base, kycScore, notes: [...notes, ...remarks], provider };
}

/** Note entries safe for logs: our own snake_case codes only, never model prose. */
export function loggableNotes(notes: string[]): string[] {
  return notes.filter((n) => /^[a-z0-9_]+$/i.test(n));
}

// ── Persistence helper (shared by /api/kyc/verify and admin re-run) ───────────

function readStoredUrl(value: string | null): string | null {
  if (!value) return null;
  if (!isEncryptedKycField(value)) return value; // legacy plaintext rows
  try { return decryptKycField(value); } catch { return null; }
}

export interface RunKycAnalysisOptions {
  /** Ping admins (notification + socket) when the result looks bad. Default true. */
  notifyAdmins?: boolean;
}

/**
 * Runs the analysis for a stored submission and persists OCR fields (encrypted)
 * plus kycScore. `faceSimilarity` / `isLive` are intentionally left untouched.
 * Returns the result, or null when vision is unavailable / the row is missing.
 */
export async function runKycAnalysisForSubmission(
  submissionId: string,
  opts: RunKycAnalysisOptions = {},
): Promise<KycAiResult | null> {
  if (!isVisionAvailable()) return null;

  const sub = await prisma.kycSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true, userId: true, idFrontUrl: true, idBackUrl: true, selfieUrl: true },
  });
  if (!sub) return null;

  const idFrontUrl = readStoredUrl(sub.idFrontUrl);
  const selfieUrl = readStoredUrl(sub.selfieUrl);
  const idBackUrl = readStoredUrl(sub.idBackUrl);
  if (!idFrontUrl || !selfieUrl) {
    console.warn("[kyc-ai] submission %s: stored URLs unreadable", submissionId);
    return null;
  }

  const result = await analyzeKycDocuments({ idFrontUrl, idBackUrl, selfieUrl });

  // Only overwrite OCR fields when we actually got a parse; a failed run should
  // not wipe a previous good result (but the score is always refreshed).
  const gotParse = !result.notes.includes("ai_unparseable") && !result.notes.includes("ai_provider_failed")
    && !result.notes.includes("id_front_unfetchable") && !result.notes.includes("selfie_unfetchable");

  await prisma.kycSubmission.update({
    where: { id: submissionId },
    data: {
      kycScore: result.kycScore,
      ...(gotParse
        ? {
            ocrName: result.ocrName ? encryptKycField(result.ocrName) : null,
            ocrDob: result.ocrDob ? encryptKycField(result.ocrDob) : null,
            ocrDocNumber: result.ocrDocNumber ? encryptKycField(result.ocrDocNumber) : null,
            ocrExpiry: result.ocrExpiry ? encryptKycField(result.ocrExpiry) : null,
          }
        : {}),
    },
  });

  // Score + codes only — never image data or extracted PII.
  console.info("[kyc-ai] submission %s scored %d (%s) via %s", submissionId, result.kycScore, loggableNotes(result.notes).join(",") || "-", result.provider ?? "none");

  const needsAttention = result.kycScore < 30 || result.tamperSuspected;
  if (needsAttention && opts.notifyAdmins !== false) {
    emitToAdmins("admin_queue_update", { type: "kyc_attention", submissionId, kycScore: result.kycScore });
    try {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      await Promise.all(
        admins.map((a) =>
          createNotification({
            userId: a.id,
            type: "SYSTEM",
            title: "KYC needs attention",
            body: result.tamperSuspected
              ? `AI flagged possible document tampering on a KYC submission (score ${result.kycScore}).`
              : `AI scored a KYC submission ${result.kycScore}/100 — documents may be illegible or incomplete.`,
            link: "/admin/verification?tab=kyc",
          }).catch(() => null),
        ),
      );
    } catch (e) {
      console.warn("[kyc-ai] admin notify failed:", e instanceof Error ? e.message : e);
    }
  }

  return result;
}
