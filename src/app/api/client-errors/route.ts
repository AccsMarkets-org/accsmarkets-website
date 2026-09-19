import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

// Crash reports from user devices land in the PM2 error log, so mobile-only
// failures (stale-PWA chunk errors, WebView quirks) become debuggable without
// physical access to the device.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = await checkRateLimit(`client-errors:${ip}`, 10, 60);
  if (!allowed) return NextResponse.json({ ok: false }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const clip = (v: unknown, max: number) =>
    typeof v === "string" ? v.slice(0, max) : "";

  console.error(
    "[client-error]",
    JSON.stringify({
      message: clip(b.message, 500),
      stack: clip(b.stack, 2000),
      digest: clip(b.digest, 100),
      url: clip(b.url, 300),
      ua: req.headers.get("user-agent")?.slice(0, 300) ?? "",
      ip,
      at: new Date().toISOString(),
    }),
  );

  return NextResponse.json({ ok: true });
}
