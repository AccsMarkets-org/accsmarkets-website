import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { PromoCodesAdminClient } from "@/components/admin/PromoCodesAdminClient";

export default async function AdminPromoCodesPage() {
  const session = await requireAdmin("MANAGE_MARKETING");
  if (!session) redirect("/admin");

  return <PromoCodesAdminClient />;
}
