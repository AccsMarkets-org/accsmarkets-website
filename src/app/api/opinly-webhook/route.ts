import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { Webhook } from "svix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Maps an Opinly content path to this site's route. Opinly publishes under
// /blog by default; our integration lives at /resources.
function mapPath(p: string): string | null {
  if (!p) return null;
  if (p === "/sitemap" || p === "/sitemap.xml") return "/sitemap.xml";
  if (p === "/blog" || p === "/") return "/resources";
  if (p.startsWith("/blog/")) return p.replace(/^\/blog/, "/resources");
  if (p.startsWith("/resources")) return p; // already mapped
  return null;
}

export async function POST(req: Request) {
  const secret = process.env.SVIX_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  // 1) Verify the Svix signature over the raw body.
  let payload: { type?: string; data?: { paths?: string[] } };
  try {
    payload = new Webhook(secret).verify(rawBody, headers) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 2) Invalidate caches. revalidateTag busts every Opinly fetch at once;
  //    revalidatePath targets the specific mapped routes for precision.
  try {
    revalidateTag("opinly");
    const paths = payload?.data?.paths ?? [];
    const invalidated: string[] = [];
    for (const p of paths) {
      const mapped = mapPath(p);
      if (mapped) {
        revalidatePath(mapped);
        invalidated.push(mapped);
      }
    }
    // Content changes affect the merged sitemap and the RSS feed too.
    revalidatePath("/sitemap.xml");
    revalidatePath("/resources/rss.xml");
    return NextResponse.json({ ok: true, invalidated }, { status: 200 });
  } catch {
    // Signature was valid; acknowledge even if a revalidate call hiccups.
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
