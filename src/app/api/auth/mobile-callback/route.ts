import { NextRequest, NextResponse } from "next/server";
import { decode } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";

// Only same-site paths are honoured. `new URL("https://evil.com", req.url)`
// resolves to the absolute URL, so an unchecked ?redirect= was an open
// redirect on an auth endpoint; "//evil.com" is protocol-relative and just as bad.
function safeRedirectPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/dashboard";
  return raw;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("token");
  const redirect = safeRedirectPath(searchParams.get("redirect"));

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Verify the token is a valid next-auth JWT before setting the cookie
  try {
    const decoded = await decode({ token, secret: process.env.NEXTAUTH_SECRET! });
    if (!decoded?.sub || decoded.invalid) throw new Error("Invalid token payload");
  } catch {
    return NextResponse.redirect(new URL("/login?error=InvalidToken", req.url));
  }

  const res = NextResponse.redirect(new URL(redirect, req.url));
  const maxAge = 60 * 60 * 24 * 7; // 7 days

  // Same name/options (incl. the .accsmarkets.org Domain) as the cookie
  // NextAuth itself issues, so the web session and this one are one cookie —
  // not a host-only twin that the browser sends alongside the real one.
  const cookie = authOptions.cookies!.sessionToken!;
  res.cookies.set(cookie.name, token, { ...cookie.options, maxAge });

  return res;
}
