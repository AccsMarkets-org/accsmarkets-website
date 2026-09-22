import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MaintenanceModeClient } from "./MaintenanceModeClient";

export default async function MaintenanceModePage() {
  const session = await requireAdmin("MANAGE_SETTINGS");
  if (!session) redirect("/admin?denied=1");

  const settings = await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    create: {},
    update: {},
  });

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <AdminPageHeader
        title="Maintenance Mode"
        subtitle={settings.maintenanceMode ? "Currently active — users cannot access the site" : "Control site availability and display maintenance notices"}
      />
      <MaintenanceModeClient
        initialMode={settings.maintenanceMode}
        initialTitle={settings.maintenanceTitle}
        initialMessage={settings.maintenanceMessage}
        initialEndTime={settings.maintenanceEndTime?.toISOString() ?? null}
        initialAllowAdmins={settings.maintenanceAllowAdmins}
      />
    </div>
  );
}
