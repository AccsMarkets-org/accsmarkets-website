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

import { encryptCredentials, decryptCredentials } from "@/lib/credentials-crypto";

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
