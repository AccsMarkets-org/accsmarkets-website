import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

function isAdminHost(host: string) {
  return (
    host === "admin.accsmarkets.org" ||
    host.startsWith("admin.accsmarkets.org:")
  );
}

function isMaintenanceHost(host: string) {
  return (
    host === "maintenance.accsmarkets.org" ||
    host.startsWith("maintenance.accsmarkets.org:")
  );
}

// Exact-boundary check — `pathname.startsWith("/admin")` alone also matches
// "/admin-manifest.json" and any other future "/admin*" static file or route
// that isn't actually under the admin panel, incorrectly sweeping it into
// the admin-subdomain redirect/auth gate below.
function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

const MAINTENANCE_URL = "https://maintenance.accsmarkets.org";

export default withAuth(
  function middleware(req) {
    const host = req.headers.get("host") || "";
    const onAdminSubdomain = isAdminHost(host);
    const onMaintenanceSubdomain = isMaintenanceHost(host);
    const { pathname } = req.nextUrl;
    // A token marked `invalid` by the jwt callback (ban / password reset /
    // sign-out-everywhere) carries no authority — treat it as anonymous.
    const token = req.nextauth.token?.invalid ? null : req.nextauth.token;
    const role = token?.role;

    // maintenance.accsmarkets.org always serves the maintenance page
    if (onMaintenanceSubdomain) {
      if (pathname !== "/maintenance") {
        const url = req.nextUrl.clone();
        url.pathname = "/maintenance";
        return NextResponse.rewrite(url);
      }
      return NextResponse.next();
    }

    // Maintenance mode: redirect non-admin traffic to maintenance subdomain.
    // Allow /login and /api/auth/* so admins can log in on the main domain
    // and get a session cookie that grants the ADMIN bypass.
    if (
      process.env.MAINTENANCE_MODE === "true" &&
      !onAdminSubdomain &&
      role !== "ADMIN" &&
      !pathname.startsWith("/api/") &&
      !pathname.startsWith("/_next/") &&
      pathname !== "/login"
    ) {
      return NextResponse.redirect(MAINTENANCE_URL);
    }

    if (onAdminSubdomain) {
      // All /api/* routes pass through untouched — never rewrite API paths
      if (pathname.startsWith("/api/") || pathname === "/admin/login") {
        return NextResponse.next();
      }

      // Public PWA assets must bypass the auth gate: browsers fetch manifests
      // WITHOUT credentials (per spec), so even a logged-in admin's manifest
      // request arrives with no session cookie — gating it here redirected the
      // fetch to login-page HTML, breaking install branding/start_url. A
      // redirected /sw.js additionally makes serviceWorker.register() fail.
      // These files contain nothing sensitive.
      if (
        pathname === "/admin-manifest.json" ||
        pathname === "/manifest.json" ||
        pathname === "/sw.js" ||
        pathname === "/offline.html"
      ) {
        return NextResponse.next();
      }

      // Not an admin → send to login (handles unauthenticated + wrong role)
      if (role !== "ADMIN") {
        const loginUrl = new URL(req.url);
        loginUrl.pathname = "/admin/login";
        return NextResponse.redirect(loginUrl);
      }

      // Authenticated admin: rewrite bare paths to /admin/*
      if (!isAdminPath(pathname)) {
        const url = req.nextUrl.clone();
        url.pathname = pathname === "/" ? "/admin" : `/admin${pathname}`;
        return NextResponse.rewrite(url);
      }

      return NextResponse.next();
    }

    // ── Main domain ──────────────────────────────────────────────────────────
    // /admin/* on the main domain is never valid — hard redirect to admin subdomain
    if (isAdminPath(pathname)) {
      return NextResponse.redirect("https://admin.accsmarkets.org/admin/login");
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const host = req.headers.get("host") || "";
        const { pathname } = req.nextUrl;

        // Admin subdomain — always authorize here; main function does the real check
        if (isAdminHost(host)) return true;

        // Maintenance subdomain — always allow (rewrite handled in main function)
        if (isMaintenanceHost(host)) return true;

        // Main domain /admin/* — always pass through so the middleware function
        // can hard-redirect to admin.accsmarkets.org regardless of auth state
        if (isAdminPath(pathname)) return true;

        // Main domain public routes need no token
        if (
          !pathname.startsWith("/dashboard") &&
          !pathname.startsWith("/checkout") &&
          pathname !== "/onboarding"
        ) {
          return true;
        }

        return !!token && !token.invalid;
      },
    },
  },
);

export const config = {
  matcher: [
    // Run on every path except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|images|icons|fonts|blog-images).*)",
  ],
};
