const path = require("path");
const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // This box has 2 logical CPUs and ~8GB RAM shared with MySQL + the tunnel.
  // Reverted to 1 (from 2) on 2026-09-09: free memory is now consistently
  // under 1.5GB (was 2.3-2.8GB when cpus:2 was last verified safe), and
  // prisma generate / tsc / next build all OOM-crashed at that level.
  // Raise back to 2 only after confirming free memory is comfortably above
  // ~2.5GB again (or after the pagefile is enlarged — see standing note).
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "flagcdn.com" },
      { protocol: "https", hostname: "drive.google.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      // Baseline security headers for every response. No Content-Security-Policy
      // here on purpose — AdSense/GA4/Meta Pixel/Cloudinary/Google Fonts need a
      // dedicated CSP pass.
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      // Clean headers for sitemap and robots so Googlebot doesn't choke on RSC vary headers
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Content-Type", value: "application/xml; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600" },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=86400, s-maxage=86400" },
        ],
      },
      // The service worker was inheriting a 4-hour Cache-Control from
      // somewhere upstream (Cloudflare's default static-asset TTL, most
      // likely) with no explicit override here. That means an already-
      // installed PWA could keep running yesterday's service worker — old
      // cache name, missing the /admin no-cache exclusion, none of a given
      // fix — for up to 4 hours after every single deploy, regardless of
      // how correct the new code actually is. no-cache forces a
      // revalidation round-trip on every fetch instead of trusting a stale
      // TTL, so updates propagate close to immediately.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/(manifest.json|admin-manifest.json)",
        headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }],
      },
    ];
  },
  webpack(config, { dev }) {
    // Redirect @prisma/client to a generated client outside OneDrive
    // (OneDrive locks DLLs and prevents prisma generate from renaming them) —
    // but ONLY if that custom path actually exists. A dangling alias to a
    // non-existent directory breaks webpack's module resolver on cold builds,
    // so when it's absent we fall back to standard node_modules resolution.
    const customPrisma = path.resolve(
      process.env.APPDATA
        ? path.join(process.env.APPDATA, "..", "Local", "prisma-accsmarkets")
        : require("os").homedir() + "/AppData/Local/prisma-accsmarkets"
    );
    if (require("fs").existsSync(customPrisma)) {
      config.resolve.alias["@prisma/client"] = customPrisma;
    }
    // Explicitly map the "@" path alias to /src so module resolution never
    // depends on Next's tsconfig-paths plugin being wired up for the build
    // (it can silently regress, producing "Can't resolve '@/...'" on cold builds).
    config.resolve.alias["@"] = path.resolve(__dirname, "src");
    if (!dev) {
      // Single-threaded compile → lower peak RAM on this box.
      config.parallelism = 1;
    }
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
