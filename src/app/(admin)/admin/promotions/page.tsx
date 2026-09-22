import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { PromotionsAdminClient } from "@/components/admin/PromotionsAdminClient";

export default async function AdminPromotionsPage() {
  const session = await requireAdmin("MANAGE_LISTINGS");
  if (!session) redirect("/admin");

  return <PromotionsAdminClient />;
}
