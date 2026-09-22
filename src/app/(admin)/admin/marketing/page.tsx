import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { MarketingClient } from "./MarketingClient";

export default async function AdminMarketingPage() {
  const session = await requireAdmin("MANAGE_MARKETING");
  if (!session) redirect("/admin?denied=1");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Marketing</h1>
      <MarketingClient />
    </div>
  );
}
