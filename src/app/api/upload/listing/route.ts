import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadBuffer, uploadImage } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const contentType = req.headers.get("content-type") ?? "";

    // JSON body: { dataUri: "data:image/png;base64,..." }
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      const dataUri: string | undefined = body?.dataUri;
      if (!dataUri || !dataUri.startsWith("data:")) {
        return NextResponse.json({ error: "No data URI provided" }, { status: 400 });
      }
      const mime = dataUri.slice(5, dataUri.indexOf(";"));
      if (!ALLOWED_TYPES.includes(mime)) {
        return NextResponse.json({ error: "File type not allowed. Use JPG, PNG, or WEBP." }, { status: 400 });
      }
      // Base64 encodes 3 bytes as 4 chars, so decoded size ≈ payload length * 3/4.
      // Previously only the FormData branch below enforced MAX_SIZE — this JSON
      // path could accept an arbitrarily large image.
      const base64Payload = dataUri.slice(dataUri.indexOf(",") + 1);
      const approxBytes = Math.floor((base64Payload.length * 3) / 4);
      if (approxBytes > MAX_SIZE) {
        return NextResponse.json({ error: "File too large. Maximum 10 MB." }, { status: 400 });
      }
      const url = await uploadImage(dataUri, "listings");
      return NextResponse.json({ url });
    }

    // FormData body: file field
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed. Use JPG, PNG, or WEBP." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum 10 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadBuffer(buffer, file.type, "listings");
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 502 },
    );
  }
}
