import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  idFrontUrl: z.string().url(),
  idBackUrl: z.string().url(),
  selfieUrl: z.string().url(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (user.kycLevel === "NONE" || user.kycLevel === "EMAIL")
    return NextResponse.json({ error: "Phone verification required first" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  // Create submission. Auto-approve if OPENKYC_SERVER_URL is not configured.
  const hasAutoKyc = Boolean(process.env.OPENKYC_SERVER_URL);
  const status = hasAutoKyc ? "PENDING" : "UNDER_REVIEW";

  const submission = await prisma.kycSubmission.create({
    data: { userId: session.user.id, ...parsed.data, status },
  });

  return NextResponse.json({ id: submission.id, status });
}
