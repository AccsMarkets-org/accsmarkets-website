import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PayPalAccountsClient } from "./PayPalAccountsClient";

export default async function AdminPayPalAccountsPage() {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) redirect("/admin?denied=1");

  const accounts = await prisma.platformPayPalAccount.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">PayPal Accounts</h1>
      <PayPalAccountsClient initialAccounts={accounts} />
    </div>
  );
}
