import { SystemDashboard } from "@/components/admin/SystemDashboard";

export const metadata = { title: "System Status" };

export default function SystemPage() {
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
