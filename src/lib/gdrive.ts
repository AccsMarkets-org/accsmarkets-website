/**
 * Google Drive file upload via Service Account.
 *
 * Required env vars:
 *   GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY  – JSON string of the service account key file
 *   GOOGLE_DRIVE_FOLDER_ID            – (optional) Drive folder ID to upload into
 *
 * The service account must have "Editor" access to the target folder.
 * After uploading, files are made publicly readable so the URL works in <img> tags.
 */

import * as crypto from "crypto";

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

// Cache the token for up to 50 minutes (tokens live 60 min)
let _cachedToken: string | null = null;
let _tokenExpiry = 0;

function base64url(data: Buffer | string): string {
  const b64 = typeof data === "string" ? Buffer.from(data).toString("base64") : data.toString("base64");
  return b64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

  interface TokenResponse { access_token?: string; error?: string; error_description?: string; }
  let data: TokenResponse;

  // OAuth refresh token is required for personal Drive (service accounts have no storage quota).
  if (
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  ) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });
    data = await res.json();
  } else {
    throw new Error("No Google Drive OAuth credentials configured");
  }

  if (!data.access_token) {
    throw new Error(`Google Drive auth failed: ${data.error_description ?? data.error ?? "unknown"}`);
  }

  _cachedToken = data.access_token;
  _tokenExpiry = Date.now() + 50 * 60 * 1000;
  return _cachedToken;
}

/**
 * Upload a file to Google Drive and return a public view URL.
 *
 * @param data - A data URI (`data:image/png;base64,...`) or a raw Buffer
 * @param filename - Name for the file in Drive (e.g. `avatar-abc123.jpg`)
 * @param mimeType - MIME type (ignored when data URI is provided — parsed from it)
 */
export async function uploadToDrive(
  data: string | Buffer,
  filename: string,
  mimeType = "application/octet-stream"
): Promise<string> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID ?? null;
  const token = await getAccessToken();

  // Parse data URI
  let buffer: Buffer;
  let mime = mimeType;
  if (typeof data === "string" && data.startsWith("data:")) {
    const comma = data.indexOf(",");
    mime = data.slice(5, data.indexOf(";"));
    buffer = Buffer.from(data.slice(comma + 1), "base64");
  } else if (typeof data === "string") {
    buffer = Buffer.from(data, "base64");
  } else {
    buffer = data;
  }

  // Build multipart body
  const metadata: Record<string, unknown> = { name: filename, mimeType: mime };
  if (folderId) metadata.parents = [folderId];

  const boundary = "AccsMktsBoundary314159";
  const CRLF = "\r\n";

  async function doUpload(uploadBody: Buffer, uploadMeta: Record<string, unknown>): Promise<DriveFile> {
    const metaJson = JSON.stringify(uploadMeta);
    const parts = [
      `--${boundary}${CRLF}`,
      `Content-Type: application/json; charset=UTF-8${CRLF}${CRLF}`,
      metaJson,
      `${CRLF}--${boundary}${CRLF}`,
      `Content-Type: ${mime}${CRLF}${CRLF}`,
    ];
    const head = Buffer.from(parts.join(""));
    const tail = Buffer.from(`${CRLF}--${boundary}--`);
    const multipart = Buffer.concat([head, uploadBody, tail]);
    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: multipart,
      }
    );
    return res.json();
  }

  interface DriveFile { id?: string; error?: { message?: string; code?: number } }

  let file: DriveFile = await doUpload(buffer, metadata);
  if ((!file.id) && folderId) {
    // Folder may not be shared with the service account — retry without parent constraint.
    console.warn("[gdrive] Folder upload failed (%s), retrying without parent folder", file.error?.message);
    const metaNoFolder = { name: filename, mimeType: mime };
    file = await doUpload(buffer, metaNoFolder);
  }
  if (!file.id) {
    console.error("[gdrive] Upload failed:", file.error);
    throw new Error(`Drive upload failed: ${file.error?.message ?? "unknown error"}`);
  }

  // Make public
  await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  }).catch(() => {}); // non-fatal — the upload still succeeded

  return `https://lh3.googleusercontent.com/d/${file.id}`;
}

export function isDriveConfigured(): boolean {
  return !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  );
}
