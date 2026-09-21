export async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) {
    // No secret configured — fail open ONLY outside production (local dev
    // without hCaptcha set up). In production a missing secret fails closed, so
    // a dropped env var can't silently turn captcha protection off.
    return process.env.NODE_ENV !== "production";
  }
  if (!token) return false;

  try {
    const res = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
