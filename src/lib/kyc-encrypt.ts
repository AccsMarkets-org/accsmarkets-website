/**
 * KYC field encryption helpers.
 *
 * Wraps the project-wide AES-256-GCM credential crypto so that KYC PII
 * (document numbers, dates of birth, OCR names, document image URLs) can be
 * stored encrypted at rest and decrypted only on the server.
 *
 * Environment variable required: CREDENTIALS_ENCRYPTION_KEY (64 hex chars / 32 bytes).
 *
 * Usage:
 *   import { encryptKycField, decryptKycField } from "@/lib/kyc-encrypt";
 *
 *   // Store:
 *   const encryptedDocNumber = encryptKycField(rawDocNumber);
 *   await prisma.kycSubmission.create({ data: { ocrDocNumber: encryptedDocNumber, ... } });
 *
 *   // Read:
 *   const docNumber = decryptKycField(submission.ocrDocNumber);
 *
 * Fields that should be encrypted before storage:
 *   - ocrName       (full name extracted by OCR)
 *   - ocrDob        (date of birth string)
 *   - ocrDocNumber  (passport / ID number)
 *   - ocrExpiry     (document expiry date)
 *   - idFrontUrl    (Cloudinary URL for ID front)
 *   - idBackUrl     (Cloudinary URL for ID back)
 *   - selfieUrl     (Cloudinary URL for selfie)
 *
 * NOTE: Existing rows pre-dating encryption must be migrated before enabling
 * decryptKycField on all reads. A one-time migration script should:
 *   1. Fetch all rows where ocrDocNumber does NOT match the iv:tag:ct format.
 *   2. Re-save each field encrypted.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { encryptCredentials, decryptCredentials } from "@/lib/credentials-crypto";

// ── Upload → submit binding ───────────────────────────────────────────────────
// /api/upload/kyc returns { url, sig } and /api/kyc/verify only accepts a URL
// whose sig verifies for the *same* user. This stops a submitter from pointing
// their KYC record at an arbitrary image (or someone else's upload).

const UPLOAD_SIG_TTL_MS = 6 * 60 * 60 * 1000; // 6h — must outlive an upload → submit session

function hmacKey(): Buffer {
  const hex = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY must be a 32-byte hex string (64 chars)");
  }
  return Buffer.from(hex, "hex");
}

function uploadMac(userId: string, url: string, exp: number): string {
  return createHmac("sha256", hmacKey()).update(`kyc-upload|${userId}|${url}|${exp}`).digest("hex");
}

/** Returns "<expiryMs>.<hmacHex>" binding this URL to this user for a limited time. */
export function signKycUpload(userId: string, url: string): string {
  const exp = Date.now() + UPLOAD_SIG_TTL_MS;
  return `${exp}.${uploadMac(userId, url, exp)}`;
}

/** Verifies a signature produced by signKycUpload (constant-time, expiry-checked). */
export function verifyKycUploadSig(userId: string, url: string, sig: string): boolean {
  const dot = sig.indexOf(".");
  if (dot <= 0) return false;
  const exp = Number(sig.slice(0, dot));
  const mac = sig.slice(dot + 1);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  if (!/^[0-9a-f]{64}$/.test(mac)) return false;
  try {
    const expected = Buffer.from(uploadMac(userId, url, exp), "hex");
    const given = Buffer.from(mac, "hex");
    return expected.length === given.length && timingSafeEqual(expected, given);
  } catch {
    return false;
  }
}

/**
 * Encrypts a plaintext KYC field value.
 * Returns a string in the format `iv:authTag:ciphertext` (all hex).
 */
export function encryptKycField(value: string): string {
  return encryptCredentials(value);
}

/**
 * Decrypts a KYC field value that was encrypted with encryptKycField.
 * Throws if the payload is malformed or the key is wrong.
 */
export function decryptKycField(encrypted: string): string {
  return decryptCredentials(encrypted);
}

/**
 * Returns true when a string looks like it has already been encrypted
 * (matches the iv:authTag:ciphertext hex format).
 * Use this during a migration to avoid double-encrypting a field.
 */
export function isEncryptedKycField(value: string): boolean {
  // Format: 24-char hex IV : 32-char hex auth tag : N-char hex ciphertext
  return /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/i.test(value);
}

/**
 * Convenience helper: encrypt the field only when it has not already been
 * encrypted (idempotent for incremental migration scenarios).
 */
export function encryptKycFieldIfNeeded(value: string): string {
  if (!value || isEncryptedKycField(value)) return value;
  return encryptKycField(value);
}
