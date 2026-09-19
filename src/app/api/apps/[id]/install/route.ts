import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const installSchema = z.object({
  grantedScopes: z.array(z.string()).min(1),
});

// POST /api/apps/[id]/install — install an app and grant scopes
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const app = await prisma.appListing.findUnique({ where: { id: params.id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.status !== "APPROVED") {
    return NextResponse.json({ error: "App is not available for installation" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = installSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  // Verify granted scopes are a subset of requested scopes
  const requested = app.apiScopesRequested as string[];
  const invalid = parsed.data.grantedScopes.filter((s) => !requested.includes(s));
  if (invalid.length > 0) {
    return NextResponse.json({ error: `Unknown scopes: ${invalid.join(", ")}` }, { status: 400 });
  }

  const installation = await prisma.$transaction(async (tx) => {
    const inst = await tx.appInstallation.upsert({
      where: { appId_userId: { appId: params.id, userId: session.user.id } },
      update: { grantedScopes: parsed.data.grantedScopes },
      create: { appId: params.id, userId: session.user.id, grantedScopes: parsed.data.grantedScopes },
    });
    await tx.appListing.update({
      where: { id: params.id },
      data: { installCount: { increment: 1 } },
    });
    return inst;
  });

  return NextResponse.json({ installation }, { status: 201 });
}

// DELETE /api/apps/[id]/install — uninstall an app
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.appInstallation.deleteMany({
    where: { appId: params.id, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
