import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { FeatureFlagManager } from "@/components/admin/FeatureFlagManager";

export const metadata = { title: "Feature Flags" };

export default async function FeatureFlagsPage() {
  const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Feature Flags</h1>
      <Card>
        <p className="mb-4 text-sm text-muted">
          Toggle features on/off globally or roll them out to a percentage of users.
        </p>
        <FeatureFlagManager initialFlags={flags} />
      </Card>
    </div>
  );
}
