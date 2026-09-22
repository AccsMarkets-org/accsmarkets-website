import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { BlogEditClient } from "./BlogEditClient";

// Server wrapper so the permission check runs before the client editor
// mounts — a client page can't call requireAdmin itself.
export default async function BlogEditPage() {
  const session = await requireAdmin("MANAGE_BLOG");
  if (!session) redirect("/admin?denied=1");

  return <BlogEditClient />;
}
