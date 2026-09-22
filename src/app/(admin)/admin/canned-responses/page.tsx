import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { CannedResponsesClient } from "./CannedResponsesClient";

// Server wrapper so the permission check runs before the client UI mounts —
// a client page can't call requireAdmin itself.
export default async function CannedResponsesPage() {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) redirect("/admin?denied=1");

  return <CannedResponsesClient />;
}
