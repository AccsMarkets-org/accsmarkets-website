import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { signOwnershipToken } from "@/lib/ownership-token";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const CODE_RE = /AM-[A-Z0-9]{8}/;
const YT_API_KEY = process.env.YOUTUBE_API_KEY!;

// Extract channel identifier from a YouTube URL.
// Supports: /channel/UC..., /@handle, /c/custom, /user/legacy
function parseYouTubeUrl(url: string): { type: "id" | "handle" | "custom" | "username"; value: string } | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (!u.hostname.includes("youtube.com")) return null;
    const parts = u.pathname.replace(/^\/+/, "").split("/");
    if (parts[0] === "channel" && parts[1]) return { type: "id", value: parts[1] };
    if (parts[0].startsWith("@")) return { type: "handle", value: parts[0].slice(1) };
    if (parts[0] === "c" && parts[1]) return { type: "custom", value: parts[1] };
    if (parts[0] === "user" && parts[1]) return { type: "username", value: parts[1] };
    // bare /@handle at root
    if (u.pathname.startsWith("/@")) return { type: "handle", value: u.pathname.slice(2) };
  } catch {
    return null;
  }
  return null;
}

async function fetchChannelDescription(parsed: ReturnType<typeof parseYouTubeUrl>): Promise<string | null> {
  if (!parsed) return null;

  let apiUrl: string;
  const base = "https://www.googleapis.com/youtube/v3/channels";
  const fields = "items(snippet/description,id)";

  if (parsed.type === "id") {
    apiUrl = `${base}?part=snippet&id=${encodeURIComponent(parsed.value)}&fields=${fields}&key=${YT_API_KEY}`;
  } else if (parsed.type === "handle") {
    apiUrl = `${base}?part=snippet&forHandle=${encodeURIComponent(parsed.value)}&fields=${fields}&key=${YT_API_KEY}`;
  } else if (parsed.type === "custom") {
    // forUsername works for some legacy custom URLs; forHandle is preferred for @handles
    apiUrl = `${base}?part=snippet&forUsername=${encodeURIComponent(parsed.value)}&fields=${fields}&key=${YT_API_KEY}`;
  } else {
    apiUrl = `${base}?part=snippet&forUsername=${encodeURIComponent(parsed.value)}&fields=${fields}&key=${YT_API_KEY}`;
  }

  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const description: string | undefined = data?.items?.[0]?.snippet?.description;
    return description ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(`yt-check:${session.user.id}`, 10, 60);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const { accountUrl, code } = body ?? {};

  if (typeof accountUrl !== "string" || typeof code !== "string" || !accountUrl || !code || !CODE_RE.test(code)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = parseYouTubeUrl(accountUrl);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid YouTube channel URL" }, { status: 400 });
  }

  const description = await fetchChannelDescription(parsed);
  if (description === null) {
    return NextResponse.json(
      { error: "Could not fetch channel info. Make sure the URL is correct and the channel is public." },
      { status: 422 },
    );
  }

  if (!description.includes(code)) {
    return NextResponse.json(
      { error: "Verification code not found in channel description. Add it and try again." },
      { status: 422 },
    );
  }

  const token = signOwnershipToken({
    userId: session.user.id,
    accountUrl,
    method: "YOUTUBE_API",
    platformId: parsed.value,
  });

  return NextResponse.json({ token });
}
