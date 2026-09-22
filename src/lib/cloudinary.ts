/**
 * Storage abstraction — prefers Google Drive when configured, falls back to Cloudinary.
 *
 * Primary (Google Drive):
 *   GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY  – JSON string of service account key
 *   GOOGLE_DRIVE_FOLDER_ID            – (optional) folder to upload into
 *
 * Fallback (Cloudinary):
 *   CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
 *
 * Exception — KYC documents (`uploadBuffer(..., { privateAccess: true })`)
 * always go to Cloudinary as `authenticated` assets and are never made public;
 * Drive is skipped for them because its uploads grant `anyone` read access.
 */

import { uploadToDrive, isDriveConfigured } from "@/lib/gdrive";
import { v2 as cloudinary } from "cloudinary";

let cloudinaryConfigured = false;

function ensureCloudinary() {
  if (cloudinaryConfigured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  cloudinaryConfigured = true;
}

/**
 * Upload a base64 data URI to Google Drive (preferred) or Cloudinary (fallback).
 * Returns a publicly accessible URL.
 *
 * @param dataUri  e.g. "data:image/png;base64,…"
 * @param folder   logical folder name: "avatars", "listings", "kyc", "messages", etc.
 * @param filename optional file name (auto-generated when omitted)
 */
export async function uploadImage(
  dataUri: string,
  folder: string,
  filename?: string
): Promise<string> {
  if (isDriveConfigured()) {
    try {
      const mime = dataUri.slice(5, dataUri.indexOf(";"));
      const ext = mime.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
      const name = filename ?? `${folder}-${Date.now()}.${ext}`;
      return await uploadToDrive(dataUri, name, mime);
    } catch (err) {
      console.error("[storage] Google Drive upload failed, falling back to Cloudinary:", err instanceof Error ? err.message : err);
      // Fall through to Cloudinary
    }
  }

  // Cloudinary fallback
  ensureCloudinary();
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error("No storage provider configured.");
  }
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `accsmarkets/${folder}`,
    resource_type: "image",
  });
  return result.secure_url;
}

export interface UploadBufferOptions {
  /**
   * Private-access mode (used for KYC documents): the file is NOT made public.
   * It bypasses Google Drive entirely (Drive uploads grant `anyone` reader
   * access) and is uploaded to Cloudinary with `type: "authenticated"`, so the
   * asset is unreachable without a signature. The returned URL is a signed
   * download link that expires after KYC_SIGNED_URL_TTL_SECONDS (24h default);
   * call `resignKycUrl()` to mint a fresh one from a stored URL.
   *
   * If Cloudinary is not configured, falls back to the regular public path
   * (current behaviour) and logs a warning.
   */
  privateAccess?: boolean;
}

/**
 * Upload a raw Buffer (e.g. from file.arrayBuffer()) to storage.
 * Returns a publicly accessible URL (or a signed, expiring URL in private mode).
 */
export async function uploadBuffer(
  buffer: Buffer,
  mimeType: string,
  folder: string,
  filename?: string,
  opts: UploadBufferOptions = {}
): Promise<string> {
  if (opts.privateAccess) {
    if (isCloudinaryConfigured()) {
      return uploadPrivateToCloudinary(buffer, mimeType, folder);
    }
    console.warn("[storage] privateAccess requested but Cloudinary is not configured — falling back to public storage");
  }
  // Convert to data URI and delegate to uploadImage which has Drive → Cloudinary fallback.
  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
  return uploadImage(dataUri, folder, filename);
}

// ── Private (authenticated) Cloudinary assets — KYC ───────────────────────────

const KYC_SIGNED_URL_TTL = Number(process.env.KYC_SIGNED_URL_TTL_SECONDS) || 24 * 60 * 60;

export function isCloudinaryConfigured(): boolean {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function signedDownloadUrl(publicId: string, format: string): string {
  ensureCloudinary();
  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: "image",
    type: "authenticated",
    attachment: false,
    expires_at: Math.floor(Date.now() / 1000) + KYC_SIGNED_URL_TTL,
  });
}

async function uploadPrivateToCloudinary(buffer: Buffer, mimeType: string, folder: string): Promise<string> {
  ensureCloudinary();
  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `accsmarkets/${folder}`,
    resource_type: "image",
    type: "authenticated",
    overwrite: false,
    invalidate: false,
  });
  return signedDownloadUrl(result.public_id, result.format);
}

/** Cloudinary folder prefix that KYC uploads for a user live under. */
export function kycCloudinaryFolder(userId: string): string {
  return `accsmarkets/kyc/${userId}/`;
}

/**
 * Parse a Cloudinary URL produced by the private KYC path (or a legacy public
 * delivery URL) back into its public_id + format. Returns null for non-Cloudinary URLs.
 */
export function parseCloudinaryUrl(url: string): { publicId: string; format: string; authenticated: boolean } | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }

  // Signed download link: https://api.cloudinary.com/v1_1/<cloud>/image/download?public_id=..&format=..&type=..
  if (u.hostname === "api.cloudinary.com" && u.pathname.endsWith("/image/download")) {
    const publicId = u.searchParams.get("public_id");
    const format = u.searchParams.get("format");
    if (!publicId || !format) return null;
    return { publicId, format, authenticated: u.searchParams.get("type") === "authenticated" };
  }

  // Delivery link: https://res.cloudinary.com/<cloud>/image/<type>/[s--sig--/][v123/]<public_id>.<ext>
  if (u.hostname === "res.cloudinary.com") {
    const m = u.pathname.match(/^\/[^/]+\/image\/(upload|authenticated|private)\/(?:s--[^/]+--\/)?(?:v\d+\/)?(.+)\.([a-z0-9]+)$/i);
    if (!m) return null;
    return { publicId: decodeURIComponent(m[2]), format: m[3].toLowerCase(), authenticated: m[1] === "authenticated" };
  }
  return null;
}

/**
 * Given a stored KYC document URL, return a URL that is valid right now.
 * Authenticated Cloudinary assets get a fresh 24h signed link; anything else
 * (Drive links, legacy public Cloudinary uploads) is returned unchanged.
 */
export function resignKycUrl(url: string): string {
  const parsed = parseCloudinaryUrl(url);
  if (!parsed || !parsed.authenticated || !isCloudinaryConfigured()) return url;
  try {
    return signedDownloadUrl(parsed.publicId, parsed.format);
  } catch {
    return url;
  }
}
