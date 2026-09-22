import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { BankAccountsClient } from "./BankAccountsClient";

export default async function AdminBankAccountsPage() {
  const session = await requireAdmin("MANAGE_FINANCE");
  if (!session) redirect("/admin?denied=1");

  const accounts = await prisma.platformBankAccount.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Bank Accounts</h1>
      <BankAccountsClient initialAccounts={accounts} />
    </div>
  );
}
