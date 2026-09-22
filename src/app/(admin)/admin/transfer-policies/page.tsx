import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PLATFORM_LABEL } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { TransferPolicyEditor } from "@/components/admin/TransferPolicyEditor";
import type { Platform } from "@prisma/client";

const PLATFORMS = Object.keys(PLATFORM_LABEL) as Platform[];

export default async function TransferPoliciesPage() {
  const session = await requireAdmin("MANAGE_LISTINGS");
  if (!session) redirect("/admin?denied=1");

  const policies = await prisma.platformTransferPolicy.findMany({ orderBy: { platform: "asc" } });
  const policyMap = Object.fromEntries(policies.map((p) => [p.platform, p]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Transfer Policies</h1>
        <p className="mt-1 text-sm text-muted">
          Set per-platform transfer timelines and compliance notices shown to buyers on the escrow page.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PLATFORMS.map((platform) => (
          <Card key={platform}>
            <h2 className="mb-3 font-semibold">{PLATFORM_LABEL[platform]}</h2>
            <TransferPolicyEditor
              platform={platform}
              existing={policyMap[platform] ?? null}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
