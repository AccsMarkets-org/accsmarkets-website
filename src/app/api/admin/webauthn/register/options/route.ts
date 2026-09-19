import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { rpID, rpName, setChallengeCookie } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

/** GET — generates a registration challenge for the currently-signed-in admin to enroll a new device (Face ID / Touch ID / security key). */
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.webAuthnCredential.findMany({
    where: { userId: session.user.id },
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpID,
    rpName,
    userID: session.user.id,
    userName: session.user.email ?? session.user.id,
    userDisplayName: session.user.name ?? session.user.email ?? "Admin",
    attestationType: "none",
    // Don't let the same device register twice.
    excludeCredentials: existing.map((c) => ({
      id: isoBase64URL.toBuffer(c.credentialId),
      type: "public-key" as const,
      transports: c.transports ? (c.transports.split(",") as AuthenticatorTransportFuture[]) : undefined,
    })),
    authenticatorSelection: {
      // "platform" is what actually triggers Face ID / Touch ID / Windows
      // Hello — a cross-platform security key would ignore this anyway, but
      // this is specifically the Face ID feature that was asked for.
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
  });

  setChallengeCookie(options.challenge);
  return NextResponse.json(options);
}
