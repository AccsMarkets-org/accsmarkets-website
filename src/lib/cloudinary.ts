/**
 * Storage abstraction — prefers Google Drive when configured, falls back to Cloudinary.
 *
 * Primary (Google Drive):
 *   GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY  – JSON string of service account key
 *   GOOGLE_DRIVE_FOLDER_ID            – (optional) folder to upload into
 *
 * Fallback (Cloudinary):
 *   CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
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

/**
 * Upload a raw Buffer (e.g. from file.arrayBuffer()) to storage.
 * Returns a publicly accessible URL.
 */
export async function uploadBuffer(
  buffer: Buffer,
  mimeType: string,
  folder: string,
  filename?: string
): Promise<string> {
  // Convert to data URI and delegate to uploadImage which has Drive → Cloudinary fallback.
  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
  return uploadImage(dataUri, folder, filename);
}
