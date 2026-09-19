import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { PLATFORM_LABEL } from "@/lib/constants";
import { EscrowEmailPool } from "@/components/admin/EscrowEmailPool";
import type { Platform } from "@prisma/client";

export default async function EscrowEmailsPage() {
  const emails = await prisma.escrowManagerEmail.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      escrow: {
        select: {
          id: true,
          status: true,
          listing: { select: { title: true } },
        },
      },
    },
  });

  const platforms = Object.keys(PLATFORM_LABEL) as Platform[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Escrow Email Pool</h1>
        <p className="mt-1 text-sm text-muted">
          Manage the pool of escrow emails used for manager-add channel transfers.
        </p>
      </div>
      <Card>
        <EscrowEmailPool
          emails={emails.map((e) => ({
            id: e.id,
            address: e.address,
            platform: e.platform,
            status: e.status,
            notes: e.notes,
            addedAsManagerAt: e.addedAsManagerAt?.toISOString() ?? null,
            createdAt: e.createdAt.toISOString(),
            escrow: e.escrow
              ? {
                  id: e.escrow.id,
                  status: e.escrow.status,
                  listingTitle: e.escrow.listing.title,
                }
              : null,
          }))}
          platforms={platforms.map((p) => ({ value: p, label: PLATFORM_LABEL[p] }))}
        />
      </Card>
    </div>
  );
}
