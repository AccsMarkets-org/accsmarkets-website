import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { signOwnershipToken } from "@/lib/ownership-token";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const CODE_RE = /AM-[A-Z0-9]{8}/;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Extract @username or numeric chat id from a t.me or telegram URL
function parseTelegramUrl(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (!u.hostname.includes("t.me") && !u.hostname.includes("telegram")) return null;
    // t.me/@username or t.me/username
    const seg = u.pathname.replace(/^\/+@?/, "").split("/")[0];
    return seg || null;
  } catch {
    return null;
  }
}

async function fetchTelegramDescription(username: string): Promise<string | null> {
  if (!BOT_TOKEN) return null;
  try {
    const chatId = username.startsWith("@") ? username : `@${username}`;
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${encodeURIComponent(chatId)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.ok) return null;
    // Public channels/groups return description; bios are in bio field
    return data.result?.description ?? data.result?.bio ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(`tg-check:${session.user.id}`, 10, 60);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const { accountUrl, code } = body ?? {};

  if (!accountUrl || !code || !CODE_RE.test(code)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!BOT_TOKEN) {
    return NextResponse.json(
      { error: "Telegram verification is not configured. Please contact support." },
      { status: 503 },
    );
  }

  const username = parseTelegramUrl(accountUrl);
  if (!username) {
    return NextResponse.json({ error: "Invalid Telegram channel/group URL" }, { status: 400 });
  }

  const description = await fetchTelegramDescription(username);
  if (description === null) {
    return NextResponse.json(
      { error: "Could not fetch channel info. Make sure it is a public channel/group and the URL is correct." },
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
    method: "TELEGRAM_API",
    platformId: username,
  });

  return NextResponse.json({ token });
}
