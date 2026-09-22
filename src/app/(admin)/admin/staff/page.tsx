import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

const StaffManagementClient = dynamic(
  () => import("@/components/admin/StaffManagementClient").then((m) => ({ default: m.StaffManagementClient })),
  { ssr: false }
);

export default async function StaffPage() {
  const session = await requireAdmin("MANAGE_STAFF");
  if (!session) redirect("/admin?denied=1");

  return <StaffManagementClient />;
}
