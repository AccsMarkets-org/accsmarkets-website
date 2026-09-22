import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { SystemDashboard } from "@/components/admin/SystemDashboard";

export const metadata = { title: "System Status" };

export default async function SystemPage() {
  const session = await requireAdmin("VIEW_ANALYTICS");
  if (!session) redirect("/admin?denied=1");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Status</h1>
        <p className="mt-1 text-sm text-muted">Live health checks — refreshes every 30 seconds.</p>
      </div>
      <SystemDashboard />
    </div>
  );
}
