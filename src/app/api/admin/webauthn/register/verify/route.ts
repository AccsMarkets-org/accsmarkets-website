import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { requireAdmin, auditLog } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { rpID, origin, getChallengeCookie, clearChallengeCookie } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  response: z.any(),
});

/** POST — verifies the attestation from a just-completed registration ceremony and stores the new credential. */
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const challenge = getChallengeCookie();
  if (!challenge) return NextResponse.json({ error: "Registration expired — try again." }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: parsed.data.response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Verification failed" }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Could not verify this device." }, { status: 400 });
  }

  clearChallengeCookie();

  const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  // Same physical device re-registering (e.g. after a "Remove" then re-enroll) overwrites cleanly.
  await prisma.webAuthnCredential.upsert({
    where: { credentialId: isoBase64URL.fromBuffer(credentialID) },
    create: {
      userId: session.user.id,
      credentialId: isoBase64URL.fromBuffer(credentialID),
      publicKey: isoBase64URL.fromBuffer(credentialPublicKey),
      counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: parsed.data.response?.response?.transports?.join(",") ?? null,
      name: parsed.data.name?.trim() || "Face ID",
    },
    update: {
      publicKey: isoBase64URL.fromBuffer(credentialPublicKey),
      counter,
      lastUsedAt: new Date(),
    },
  });

  await auditLog(prisma, session.user.id, "webauthn.register", "User", session.user.id);

  return NextResponse.json({ ok: true });
}
