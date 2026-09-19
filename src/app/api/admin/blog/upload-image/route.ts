import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { uploadBuffer } from "@/lib/cloudinary";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const LOCAL_STORE = path.join(process.cwd(), "storage", "blog-images");

async function saveLocal(buffer: Buffer, mimeType: string): Promise<string> {
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
  const filename = `blog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await fs.mkdir(LOCAL_STORE, { recursive: true });
  await fs.writeFile(path.join(LOCAL_STORE, filename), buffer);
  return `/api/blog-images/${filename}`;
}

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_BLOG");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Use JPG, PNG, WEBP, GIF, or AVIF." },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum 10 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let url: string;
    try {
      url = await uploadBuffer(buffer, file.type, "blog");
    } catch {
      // Fall back to local storage when no cloud provider is configured
      url = await saveLocal(buffer, file.type);
    }

    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
