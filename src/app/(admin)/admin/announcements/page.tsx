import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDate } from "@/lib/utils";
import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { CreateAnnouncementForm } from "@/components/admin/CreateAnnouncementForm";

export default async function AdminAnnouncementsPage() {
  const session = await requireAdmin("MANAGE_MARKETING");
  if (!session) redirect("/admin?denied=1");

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Announcements</h1>
      <CreateAnnouncementForm />
      <div className="flex flex-col gap-3">
        {announcements.map((ann) => (
          <Card key={ann.id} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{ann.message}</p>
                <p className="text-xs text-muted mt-0.5">
                  {ann.type} · {ann.targetAudience} · {formatDate(ann.createdAt)}
                </p>
                {ann.linkUrl && (
                  <a href={ann.linkUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline">{ann.linkText ?? ann.linkUrl}</a>
                )}
              </div>
              <StatusPill
                label={ann.isActive ? "Active" : "Inactive"}
                className={ann.isActive ? "bg-success/10 text-success" : "bg-muted/10 text-muted"}
              />
            </div>
            <AdminActionButtons
              endpoint={`/api/admin/announcements/${ann.id}`}
              actions={[
                { label: ann.isActive ? "Deactivate" : "Activate", action: "toggle", variant: "outline" as const, method: "PUT" as const },
                { label: "Delete", action: "delete", variant: "danger" as const, confirm: "Delete this announcement?", method: "PUT" as const },
              ]}
            />
          </Card>
        ))}
        {announcements.length === 0 && <p className="py-10 text-center text-muted">No announcements yet.</p>}
      </div>
    </div>
  );
}
