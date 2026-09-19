import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const dataUri: string | undefined = body?.dataUri;
  if (!dataUri || !dataUri.startsWith("data:image/")) {
    return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
  }
  const mime = dataUri.slice(5, dataUri.indexOf(";"));
  if (!ALLOWED_TYPES.includes(mime)) {
    return NextResponse.json({ error: "File type not allowed. Use JPG, PNG, WEBP, or GIF." }, { status: 400 });
  }
  const base64Payload = dataUri.slice(dataUri.indexOf(",") + 1);
  const approxBytes = Math.floor((base64Payload.length * 3) / 4);
  if (approxBytes > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum 10 MB." }, { status: 400 });
  }

  const url = await uploadImage(dataUri, "covers");
  await prisma.$executeRaw`UPDATE \`user\` SET \`coverPhoto\` = ${url} WHERE id = ${session.user.id}`;

  return NextResponse.json({ url });
}
