import { prisma } from "@/lib/db";

/** True only once a WhatsApp OTP has actually been confirmed (see
 * src/app/api/verification/phone/confirm) — not just requested. */
export async function isPhoneVerified(userId: string): Promise<boolean> {
  const record = await prisma.phoneVerification.findUnique({
    where: { userId },
    select: { verifiedAt: true },
  });
  return Boolean(record?.verifiedAt);
}

/**
 * Whether listing/buying/chat should actually be gated behind phone
 * verification. Deliberately a manual switch, not auto-detected from
 * WhatsApp API config — being "configured" (API creds present) isn't the
 * same as "actually usable" (Authentication template approved, which needs
 * Meta business verification to finish first, currently pending). Flip
 * PHONE_VERIFICATION_REQUIRED=true once that's done; until then this stays
 * optional so nobody gets locked out of the marketplace over a channel
 * nobody can actually complete yet.
 */
export function isPhoneVerificationGateActive(): boolean {
  return process.env.PHONE_VERIFICATION_REQUIRED === "true";
}

/** Combines the two checks above — what every enforcement call site should use. */
export async function requiresPhoneVerification(userId: string): Promise<boolean> {
  if (!isPhoneVerificationGateActive()) return false;
  return !(await isPhoneVerified(userId));
}

export const PHONE_VERIFICATION_ERROR_CODE = "PHONE_VERIFICATION_REQUIRED";

export function phoneVerificationRequiredResponse() {
  return {
    error: "Verify your WhatsApp number to continue.",
    code: PHONE_VERIFICATION_ERROR_CODE,
  };
}
