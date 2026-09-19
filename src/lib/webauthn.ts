import { cookies } from "next/headers";

// The relying-party ID is the parent domain, not admin.accsmarkets.org
// specifically — WebAuthn allows rpID to be any registrable domain suffix of
// the origin the ceremony actually runs on (which today is always the admin
// subdomain), and using the parent domain means a registered credential
// would carry over cleanly if WebAuthn login is ever added to the main site
// too, instead of being permanently locked to the subdomain.
export const rpID = "accsmarkets.org";
export const rpName = "AccsMarkets Admin";
export const origin = "https://admin.accsmarkets.org";

const CHALLENGE_COOKIE = "webauthn_challenge";

/** Stored server-side (httpOnly cookie) between "options" and "verify" — never sent to the client as data. */
export function setChallengeCookie(challenge: string) {
  cookies().set(CHALLENGE_COOKIE, challenge, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 5, // 5 minutes is generous for a Face ID prompt, short enough to limit replay window
  });
}

export function getChallengeCookie(): string | null {
  return cookies().get(CHALLENGE_COOKIE)?.value ?? null;
}

export function clearChallengeCookie() {
  cookies().set(CHALLENGE_COOKIE, "", { path: "/", maxAge: 0 });
}
