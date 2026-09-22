import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadUserDispute } from "../_shared";

export const dynamic = "force-dynamic";

/** GET /api/disputes/[id] — participant-only, user-safe view (no admin notes / counterparty statements). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dispute = await loadUserDispute(params.id, session.user.id);
  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  return NextResponse.json({ dispute });
}
