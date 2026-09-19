import { NextRequest, NextResponse } from "next/server";
import { decode } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("token");
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Verify the token is a valid next-auth JWT before setting the cookie
  try {
    const decoded = await decode({ token, secret: process.env.NEXTAUTH_SECRET! });
    if (!decoded?.sub) throw new Error("Invalid token payload");
  } catch {
    return NextResponse.redirect(new URL("/login?error=InvalidToken", req.url));
  }

  const res = NextResponse.redirect(new URL(redirect, req.url));
  const isSecure = req.url.startsWith("https");
  const maxAge = 60 * 60 * 24 * 7; // 7 days

  // Set both cookie name variants — next-auth picks the one matching the environment
  const cookieOpts = {
    httpOnly: true,
    path: "/",
    maxAge,
    sameSite: "lax" as const,
  };

  if (isSecure) {
    res.cookies.set("__Secure-next-auth.session-token", token, {
      ...cookieOpts,
      secure: true,
    });
  } else {
    res.cookies.set("next-auth.session-token", token, {
      ...cookieOpts,
      secure: false,
    });
  }

  return res;
}
