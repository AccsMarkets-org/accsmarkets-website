import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PrivacySettingsClient } from "@/components/settings/PrivacySettingsClient";

export const metadata = { title: "Privacy — Settings" };

export default async function PrivacySettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const [exportRequests, erasureRequests] = await Promise.all([
    prisma.dataExportRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { requestedAt: "desc" },
      take: 5,
    }),
    prisma.dataErasureRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { requestedAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Privacy</h1>
        <p className="mt-1 text-sm text-muted">Manage your data and account deletion.</p>
      </div>
      <PrivacySettingsClient
        exportRequests={exportRequests.map((r) => ({
          id: r.id,
          status: r.status,
          requestedAt: r.requestedAt.toISOString(),
          completedAt: r.completedAt?.toISOString() ?? null,
        }))}
        erasureRequests={erasureRequests.map((r) => ({
          id: r.id,
          status: r.status,
          requestedAt: r.requestedAt.toISOString(),
        }))}
      />
    </div>
  );
}
