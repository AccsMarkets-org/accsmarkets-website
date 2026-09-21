import crypto from "crypto";
import { encryptCredentials, decryptCredentials } from "@/lib/credentials-crypto";

const DIGITS = 6;
const STEP = 30; // seconds
const WINDOW = 1; // ±1 step tolerance

/** Generate a random 20-byte base32-encoded TOTP secret. */
export function generateSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

/** Encrypt a raw secret for DB storage (reuses the escrow AES-256-GCM helper). */
export function encryptSecret(secret: string): string {
  return encryptCredentials(secret);
}

/** Decrypt a stored secret back to raw base32. */
export function decryptSecret(encrypted: string): string {
  return decryptCredentials(encrypted);
}

/** True for a setup the user started but never confirmed. Undecryptable secrets count as active (fail closed). */
export function isPendingSecret(encrypted: string): boolean {
  try {
    return decryptSecret(encrypted).startsWith("PENDING:");
  } catch {
    return false;
  }
}

/** Verify a 6-digit code against the secret. Accepts ±1 window. */
export function verifyCode(secret: string, token: string): boolean {
  const t = Math.floor(Date.now() / 1000 / STEP);
  for (let i = -WINDOW; i <= WINDOW; i++) {
    if (hotp(secret, t + i) === token.replace(/\s/g, "")) return true;
  }
  return false;
}

/** Build an otpauth:// URI for QR code generation. */
export function buildOtpAuthUri(secret: string, email: string): string {
  return `otpauth://totp/AccsMarkets:${encodeURIComponent(email)}?secret=${secret}&issuer=AccsMarkets&algorithm=SHA1&digits=${DIGITS}&period=${STEP}`;
}

/** Generate 10 one-time backup codes (hex strings). */
export function generateBackupCodes(): string[] {
  return Array.from({ length: 10 }, () => crypto.randomBytes(5).toString("hex").toUpperCase());
}

// ---------- internal ----------

function hotp(secret: string, counter: number): string {
  const key = Buffer.from(base32Decode(secret));
  const msg = Buffer.alloc(8);
  // Write counter as big-endian 64-bit int (upper 32 bits are 0 for practical values).
  msg.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  msg.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac("sha1", key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

const B32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer): string {
  let result = "";
  let bits = 0;
  let value = 0;
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += B32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) result += B32_CHARS[(value << (5 - bits)) & 31];
  return result;
}

function base32Decode(str: string): Buffer {
  const s = str.replace(/=+$/, "").toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of s) {
    const idx = B32_CHARS.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}
