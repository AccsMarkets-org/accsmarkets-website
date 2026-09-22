import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { signOwnershipToken } from "@/lib/ownership-token";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const CODE_RE = /AM-[A-Z0-9]{8}/;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(`bio-check:${session.user.id}`, 10, 60);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const { accountUrl, code } = body ?? {};
  if (typeof accountUrl !== "string" || typeof code !== "string" || !accountUrl || !code || !CODE_RE.test(code)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const html = await fetchPublicPage(accountUrl);
  if (!html) {
    return NextResponse.json(
      { error: "Could not fetch the account page. Make sure it is public." },
      { status: 422 },
    );
  }

  if (!html.includes(code)) {
    return NextResponse.json(
      { error: "Verification code not found in the bio. Add it and try again." },
      { status: 422 },
    );
  }

  // Extract a stable platform ID if possible (username from URL path)
  const platformId = extractPlatformId(accountUrl);

  const token = signOwnershipToken({
    userId: session.user.id,
    accountUrl,
    method: "BIO_CODE_AUTO",
    platformId,
  });

  return NextResponse.json({ token });
}

async function fetchPublicPage(url: string): Promise<string | null> {
  try {
    const target = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(target, {
      headers: {
        // Mimic a real browser so platforms don't return empty pages
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractPlatformId(url: string): string | undefined {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    // Strip leading slash and grab first path segment as the handle/username
    const seg = u.pathname.replace(/^\/+/, "").split("/")[0];
    return seg || undefined;
  } catch {
    return undefined;
  }
}
