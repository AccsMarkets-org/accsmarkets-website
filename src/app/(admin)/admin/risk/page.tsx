import { prisma } from "@/lib/db";
import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const RiskManagementPanel = nextDynamic(
  () => import("@/components/admin/RiskManagementPanel").then((m) => ({ default: m.RiskManagementPanel })),
  { ssr: false }
);

export default async function AdminRiskPage() {
  const riskScores = await prisma.riskScore.findMany({
    where: { score: { gt: 0 }, dismissedAt: null },
    orderBy: { score: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, name: true, username: true, email: true, createdAt: true } },
    },
  });

  const openFlags = await prisma.securityFlag.count({ where: { resolvedAt: null } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Risk Management</h1>
          <p className="mt-1 text-sm text-muted">
            Flagged accounts detected by the automated risk scoring engine.
          </p>
        </div>
        {openFlags > 0 && (
          <span className="rounded-full bg-danger/10 px-3 py-1 text-sm font-semibold text-danger">
            {openFlags} open flag{openFlags !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <RiskManagementPanel initialRiskScores={riskScores} />
    </div>
  );
}
