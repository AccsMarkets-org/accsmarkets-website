import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET!;
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface OwnershipClaim {
  userId: string;
  accountUrl: string;
  method: string;        // OAUTH_GOOGLE | OAUTH_TWITTER | OAUTH_FACEBOOK | BIO_CODE_AUTO
  platformId?: string;   // channel / account ID from the platform
  exp: number;           // Unix ms
}

export function signOwnershipToken(claim: Omit<OwnershipClaim, "exp">): string {
  const payload: OwnershipClaim = { ...claim, exp: Date.now() + TTL_MS };
  const data = JSON.stringify(payload);
  const b64 = Buffer.from(data).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyOwnershipToken(
  token: string,
  expectedUserId: string,
  expectedAccountUrl: string,
): OwnershipClaim | null {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;

    const expected = createHmac("sha256", SECRET).update(b64).digest("base64url");
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

    const claim: OwnershipClaim = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (claim.exp < Date.now()) return null;
    if (claim.userId !== expectedUserId) return null;
    if (normalizeUrl(claim.accountUrl) !== normalizeUrl(expectedAccountUrl)) return null;

    return claim;
  } catch {
    return null;
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return (u.hostname + u.pathname).replace(/\/+$/, "").toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}
