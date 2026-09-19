import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORE = path.join(process.cwd(), "storage", "blog-images");
const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
};

export async function GET(_req: NextRequest, { params }: { params: { file: string } }) {
  const file = params.file;
  if (!/^[a-zA-Z0-9._-]+$/.test(file) || file.includes("..")) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const buf = await fs.readFile(path.join(STORE, file));
    const ext = file.split(".").pop()?.toLowerCase() ?? "";
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=604800, s-maxage=604800",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
