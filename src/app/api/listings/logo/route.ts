import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const YT_API_KEY = process.env.YOUTUBE_API_KEY!;

// Extract channel identifier from a YouTube URL (same logic as verify/youtube).
// Also recognizes VIDEO links (youtu.be shares, watch?v=, Shorts, live, embed) —
// sellers frequently paste those, and each one still identifies the channel
// after one extra API hop.
function parseYouTubeUrl(url: string): { type: "id" | "handle" | "custom" | "username" | "video"; value: string } | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const parts = u.pathname.replace(/^\/+/, "").split("/");
    if (u.hostname === "youtu.be" || u.hostname === "www.youtu.be") {
      return parts[0] ? { type: "video", value: parts[0] } : null;
    }
    if (!u.hostname.includes("youtube.com")) return null;
    if (parts[0] === "channel" && parts[1]) return { type: "id", value: parts[1] };
    if (parts[0].startsWith("@")) return { type: "handle", value: parts[0].slice(1) };
    if (u.pathname.startsWith("/@")) return { type: "handle", value: u.pathname.slice(2) };
    if (parts[0] === "c" && parts[1]) return { type: "custom", value: parts[1] };
    if (parts[0] === "user" && parts[1]) return { type: "username", value: parts[1] };
    if (parts[0] === "watch") {
      const v = u.searchParams.get("v");
      if (v) return { type: "video", value: v };
    }
    if ((parts[0] === "shorts" || parts[0] === "live" || parts[0] === "embed") && parts[1]) {
      return { type: "video", value: parts[1] };
    }
  } catch { /* ignore */ }
  return null;
}

async function fetchYouTubeChannel(accountUrl: string): Promise<{ logoUrl: string | null; title: string | null }> {
  const none = { logoUrl: null, title: null };
  const parsed = parseYouTubeUrl(accountUrl);
  if (!parsed || !YT_API_KEY) return none;

  const base = "https://www.googleapis.com/youtube/v3/channels";
  const fields = "items(snippet/thumbnails,snippet/title)";
  let apiUrl: string;

  try {
    if (parsed.type === "video") {
      // Video link → resolve owning channel first
      const vres = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(parsed.value)}&fields=items(snippet/channelId)&key=${YT_API_KEY}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!vres.ok) return none;
      const vdata = await vres.json();
      const channelId = vdata?.items?.[0]?.snippet?.channelId;
      if (!channelId) return none;
      apiUrl = `${base}?part=snippet&id=${encodeURIComponent(channelId)}&fields=${fields}&key=${YT_API_KEY}`;
    } else if (parsed.type === "id") {
      apiUrl = `${base}?part=snippet&id=${encodeURIComponent(parsed.value)}&fields=${fields}&key=${YT_API_KEY}`;
    } else if (parsed.type === "handle") {
      apiUrl = `${base}?part=snippet&forHandle=${encodeURIComponent(parsed.value)}&fields=${fields}&key=${YT_API_KEY}`;
    } else {
      apiUrl = `${base}?part=snippet&forUsername=${encodeURIComponent(parsed.value)}&fields=${fields}&key=${YT_API_KEY}`;
    }

    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return none;
    const data = await res.json();
    const snippet = data?.items?.[0]?.snippet;
    const t = snippet?.thumbnails;
    return {
      // Prefer medium (240px) then high then default
      logoUrl: t?.medium?.url ?? t?.high?.url ?? t?.default?.url ?? null,
      title: snippet?.title ?? null,
    };
  } catch {
    return none;
  }
}

async function fetchTikTokLogo(accountUrl: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(accountUrl)}`,
      { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.thumbnail_url ?? null;
  } catch {
    return null;
  }
}

// Fetch the page HTML server-side and extract og:image — works for Instagram, Twitter, Facebook, etc.
async function fetchOgImage(accountUrl: string): Promise<string | null> {
  try {
    const res = await fetch(accountUrl, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AccsMarketsBot/1.0)",
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract og:image
    const match =
      html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ??
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);

    const imgUrl = match?.[1];
    if (!imgUrl || imgUrl.includes("placeholder") || imgUrl.includes("default_profile")) return null;
    return imgUrl;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const platform: string = body?.platform ?? "";
  const accountUrl: string = body?.accountUrl ?? "";

  if (!accountUrl || !platform) {
    return NextResponse.json({ logoUrl: null }, { status: 400 });
  }

  let logoUrl: string | null = null;

  if (platform === "YOUTUBE") {
    const yt = await fetchYouTubeChannel(accountUrl);
    return NextResponse.json({ logoUrl: yt.logoUrl, displayName: yt.title });
  } else if (platform === "TIKTOK") {
    logoUrl = await fetchTikTokLogo(accountUrl);
  } else {
    // Instagram, Twitter/X, Facebook, Telegram, LinkedIn, Pinterest, Snapchat, Website
    logoUrl = await fetchOgImage(accountUrl);
  }

  return NextResponse.json({ logoUrl });
}
