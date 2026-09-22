import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emitToAdmins } from "@/lib/socket";
import { z } from "zod";
import { encryptKycField, verifyKycUploadSig } from "@/lib/kyc-encrypt";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { kycSubmittedTemplate } from "@/lib/email-templates";
import { isAllowedKycUrl, runKycAnalysisForSubmission } from "@/lib/kyc-ai";
import { kycCloudinaryFolder, parseCloudinaryUrl } from "@/lib/cloudinary";
import { isVisionAvailable } from "@/lib/ai";

export const dynamic = "force-dynamic";

// Each document is { url, sig } where sig came back from /api/upload/kyc for
// this same user. Legacy bare-string payloads are rejected.
const doc = z.object({
  url: z.string().url().max(2048),
  sig: z.string().min(10).max(200),
});

const schema = z.object({
  idFrontUrl: doc,
  idBackUrl: doc,
  selfieUrl: doc,
});

/**
 * A document URL is accepted only when:
 *  1. it is https on one of our storage hosts (Cloudinary / Drive),
 *  2. its HMAC (issued by /api/upload/kyc) verifies for this user and is unexpired,
 *  3. for Cloudinary, the public_id lives under this user's KYC folder.
 */
function checkDocument(userId: string, d: { url: string; sig: string }): string | null {
  if (!isAllowedKycUrl(d.url)) return "Document URL is not from an approved upload location";
  if (!verifyKycUploadSig(userId, d.url, d.sig)) return "Document upload signature is invalid or expired — please re-upload";
  const cld = parseCloudinaryUrl(d.url);
  if (cld && !cld.publicId.startsWith(kycCloudinaryFolder(userId))) return "Document does not belong to this account";
  return null;
}

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

  const { idFrontUrl, idBackUrl, selfieUrl } = parsed.data;
  for (const d of [idFrontUrl, idBackUrl, selfieUrl]) {
    const err = checkDocument(session.user.id, d);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  // Encrypt document URLs at rest so raw storage URLs are never stored in
  // plaintext in the database (defence-in-depth alongside authenticated delivery).
  const encryptedData = {
    idFrontUrl: encryptKycField(idFrontUrl.url),
    idBackUrl: encryptKycField(idBackUrl.url),
    selfieUrl: encryptKycField(selfieUrl.url),
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

  // Phase-1 AI pre-check runs in the background: OCR + quality + tamper hints
  // for the reviewer. It never auto-approves. Skipped silently without a
  // vision-capable provider key.
  if (isVisionAvailable()) {
    void (async () => {
      try {
        await runKycAnalysisForSubmission(submission.id);
        emitToAdmins("admin_queue_update", { type: "kyc_ai_done", submissionId: submission.id });
      } catch (e) {
        console.warn("[kyc-ai] background analysis failed for %s: %s", submission.id, e instanceof Error ? e.message.split("\n")[0].slice(0, 200) : "unknown");
      }
    })();
  }

  return NextResponse.json({ id: submission.id, status });
}
