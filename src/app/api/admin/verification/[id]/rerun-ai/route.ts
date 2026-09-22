import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { isVisionAvailable } from "@/lib/ai";
import { runKycAnalysisForSubmission, loggableNotes } from "@/lib/kyc-ai";

export const dynamic = "force-dynamic";

/**
 * Re-run the phase-1 AI document check for a KYC submission.
 * Exposed as POST (API) and PATCH (so the shared AdminActionButtons component,
 * which only speaks PUT/PATCH/DELETE, can trigger it).
 */
async function handle(params: { id: string }) {
  const session = await requireAdmin("MANAGE_KYC");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!isVisionAvailable()) {
    return NextResponse.json(
      { error: "No vision-capable AI provider configured (OPENAI_API_KEY or GEMINI_API_KEY)" },
      { status: 503 },
    );
  }

  const submission = await prisma.kycSubmission.findUnique({ where: { id: params.id }, select: { id: true, userId: true } });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Manual re-run: the admin is already looking at it, so skip the "needs attention" ping.
  const result = await runKycAnalysisForSubmission(params.id, { notifyAdmins: false });
  if (!result) return NextResponse.json({ error: "Analysis could not run" }, { status: 500 });

  await auditLog(prisma, session.user.id, "kyc.rerun_ai", "KycSubmission", params.id, {
    userId: submission.userId,
    kycScore: result.kycScore,
    notes: loggableNotes(result.notes),
  }).catch(() => null);

  // Return only non-PII signals; OCR values are read (decrypted) by the admin page itself.
  return NextResponse.json({
    ok: true,
    kycScore: result.kycScore,
    quality: result.quality,
    tamperSuspected: result.tamperSuspected,
    faceVisibleOnId: result.faceVisibleOnId,
    selfieHasSingleFace: result.selfieHasSingleFace,
    documentType: result.documentType ?? null,
    documentCountry: result.documentCountry ?? null,
    notes: result.notes,
    provider: result.provider ?? null,
  });
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return handle(params);
}

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  return handle(params);
}
