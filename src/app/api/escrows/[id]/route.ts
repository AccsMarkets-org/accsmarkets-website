import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptCredentials } from "@/lib/credentials-crypto";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const escrow = await prisma.escrow.findUnique({
    where: { id: params.id },
    include: {
      listing: { select: { id: true, title: true, platform: true, accountUrl: true } },
      buyer: { select: { id: true, username: true, name: true } },
      seller: { select: { id: true, username: true, name: true } },
    },
  });
  if (!escrow) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });

  const isParticipant = escrow.buyerId === session.user.id || escrow.sellerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isParticipant && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Credentials are only decrypted for the buyer (or admin), and only after submission.
  let credentials: string | null = null;
  if (
    escrow.credentialsPayload &&
    (escrow.buyerId === session.user.id || isAdmin) &&
    ["SUBMITTED", "VERIFIED", "IN_TRANSFER", "COMPLETED", "DISPUTED"].includes(escrow.status)
  ) {
    try {
      credentials = decryptCredentials(escrow.credentialsPayload);
    } catch {
      credentials = null;
    }
  }

  const { credentialsPayload: _hidden, ...safeEscrow } = escrow;
  return NextResponse.json({ escrow: { ...safeEscrow, credentials } });
}
