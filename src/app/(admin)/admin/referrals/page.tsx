import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { ReferralsAdminClient } from "@/components/admin/ReferralsAdminClient";

export default async function AdminReferralsPage() {
  const session = await requireAdmin("MANAGE_REFERRALS");
  if (!session) redirect("/admin?denied=1");

  return <ReferralsAdminClient />;
}
