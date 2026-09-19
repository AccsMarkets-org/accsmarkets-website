import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Redirect legacy /blog-images/* paths to /api/blog-images/* (new canonical).
// Old path may have stale Cloudflare 404 cache; the /api/ path does not.
export async function GET(_req: NextRequest, { params }: { params: { file: string } }) {
  const file = params.file;
  if (!/^[a-zA-Z0-9._-]+$/.test(file) || file.includes("..")) {
    return new Response("Not found", { status: 404 });
  }
  return NextResponse.redirect(new URL(`/api/blog-images/${file}`, _req.url), { status: 301 });
}
