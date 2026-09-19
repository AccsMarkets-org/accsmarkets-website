import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { EscrowSupportClient } from "@/components/admin/EscrowSupportClient";

export default async function EscrowSupportPage() {
  const session = await requireAdmin("MANAGE_ESCROW_MESSAGES");
  if (!session) redirect("/admin");

  return <EscrowSupportClient />;
}
