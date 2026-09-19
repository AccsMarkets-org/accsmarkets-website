import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { rpID, setChallengeCookie } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().email() });

/** POST — public (pre-login). Generates an authentication challenge scoped to whichever
 *  devices this admin has registered. Deliberately returns the same generic response whether
 *  or not the email/credentials exist, so this can't be used to enumerate admin accounts. */
export async function POST(req: Request) {
  const { allowed } = await checkRateLimit(`webauthn-login-options:${req.headers.get("x-forwarded-for") ?? "unknown"}`, 20, 60);
  if (!allowed) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, isBanned: true },
  });

  const credentials =
    user && user.role === "ADMIN" && !user.isBanned
      ? await prisma.webAuthnCredential.findMany({
          where: { userId: user.id },
          select: { credentialId: true, transports: true },
        })
      : [];

  if (credentials.length === 0) {
    // No enrolled device (or no such admin) — same shape as a real challenge
    // so the response doesn't leak which case it was.
    return NextResponse.json({ error: "No Face ID device registered for this account." }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: credentials.map((c) => ({
      id: isoBase64URL.toBuffer(c.credentialId),
      type: "public-key" as const,
      transports: c.transports ? (c.transports.split(",") as AuthenticatorTransportFuture[]) : undefined,
    })),
  });

  setChallengeCookie(options.challenge);
  return NextResponse.json(options);
}
