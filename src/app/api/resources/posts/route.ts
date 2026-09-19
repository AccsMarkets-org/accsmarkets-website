import { NextResponse } from "next/server";
import { getPosts } from "@/lib/opinly";

// Server-side proxy so the client "Load more" can paginate without ever seeing
// the Opinly API key.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sortParam = searchParams.get("sort");
  try {
    const list = await getPosts({
      limit: 12,
      cursor: searchParams.get("cursor") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      author: searchParams.get("author") ?? undefined,
      sort: sortParam === "oldest" ? "oldest" : sortParam === "newest" ? "newest" : undefined,
    });
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: "Failed to load posts" }, { status: 502 });
  }
}
