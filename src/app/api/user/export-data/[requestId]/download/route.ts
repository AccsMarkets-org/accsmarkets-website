import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/user/export-data/[requestId]/download -- serves a completed GDPR
// export as a downloadable file. Auth + ownership checked in one query so a
// request that isn't yours (or doesn't exist) looks identical: 404, not 403,
// to avoid confirming other users' request ids exist.
export async function GET(_req: Request, { params }: { params: { requestId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const request = await prisma.dataExportRequest.findFirst({
    where: { id: params.requestId, userId: session.user.id },
    select: { status: true, downloadUrl: true, expiresAt: true },
  });
  if (!request) return NextResponse.json({ error: "Export not found" }, { status: 404 });
  if (request.status !== "READY" || !request.downloadUrl) {
    return NextResponse.json({ error: "This export is not ready yet." }, { status: 409 });
  }
  if (request.expiresAt && request.expiresAt < new Date()) {
    return NextResponse.json({ error: "This export has expired. Request a new one." }, { status: 410 });
  }

  return new NextResponse(request.downloadUrl, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="accsmarkets-data-export.json"',
      "Cache-Control": "no-store",
    },
  });
}
