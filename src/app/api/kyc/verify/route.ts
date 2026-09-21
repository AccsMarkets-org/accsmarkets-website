import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emitToAdmins } from "@/lib/socket";
import { z } from "zod";
import { encryptKycField } from "@/lib/kyc-encrypt";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { kycSubmittedTemplate } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const schema = z.object({
  idFrontUrl: z.string().url(),
  idBackUrl: z.string().url(),
  selfieUrl: z.string().url(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkRateLimit(`kyc-verify:${session.user.id}`, 3, 86400);
  if (!allowed) {
    return NextResponse.json({ error: "Too many verification attempts. Try again tomorrow." }, { status: 429 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (user.kycLevel === "NONE" || user.kycLevel === "EMAIL")
    return NextResponse.json({ error: "Phone verification required first" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  // Encrypt document URLs at rest so raw Cloudinary URLs are never stored
  // in plaintext in the database (defence-in-depth alongside Cloudinary access controls).
  const { idFrontUrl, idBackUrl, selfieUrl } = parsed.data;
  const encryptedData = {
    idFrontUrl: encryptKycField(idFrontUrl),
    idBackUrl: encryptKycField(idBackUrl),
    selfieUrl: encryptKycField(selfieUrl),
  };

  // Submissions go straight to the admin review queue.
  const status = "UNDER_REVIEW";

  const submission = await prisma.kycSubmission.create({
    data: { userId: session.user.id, ...encryptedData, status },
  });

  // Notify online admins of the new KYC submission in the review queue.
  emitToAdmins("admin_queue_update", { type: "new_kyc" });

  if (user.email) {
    const { subject, html } = kycSubmittedTemplate(
      user.name ?? "there",
      submission.id,
      new Date().toLocaleDateString("en-US", { dateStyle: "long" }),
    );
    sendEmail({ to: user.email, subject, html }).catch(() => null);
  }

  return NextResponse.json({ id: submission.id, status });
}
