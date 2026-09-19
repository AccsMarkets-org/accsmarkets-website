import crypto from "crypto";
import { verify as totpVerify } from "otplib";

// Admin-panel TOTP uses its own encryption keyed off NEXTAUTH_SECRET (distinct
// from the regular-user 2FA implementation in src/lib/totp.ts, which uses its
// own key). This was previously duplicated across setup/enable/status/disable
// routes; consolidated here so there's one place to fix if it ever changes.
const ENC_KEY = (process.env.NEXTAUTH_SECRET ?? "fallback").slice(0, 32).padEnd(32, "0");
const IV_LEN = 12;

export function encryptAdminTotpSecret(text: string): string {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(ENC_KEY), iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), enc.toString("hex"), tag.toString("hex")].join(":");
}

export function decryptAdminTotpSecret(stored: string): string {
  try {
    const [ivHex, encHex, tagHex] = stored.split(":");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      Buffer.from(ENC_KEY),
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return decipher.update(Buffer.from(encHex, "hex")).toString("utf8") + decipher.final("utf8");
  } catch {
    return "";
  }
}

export async function verifyAdminTotpCode(secret: string, token: string): Promise<boolean> {
  const result = await totpVerify({ token: String(token).replace(/\s/g, ""), secret });
  return typeof result === "object" ? result.valid : Boolean(result);
}
