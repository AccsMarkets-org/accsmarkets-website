import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { ReferralDashboard } from "@/components/referrals/ReferralDashboard";

export const metadata = { title: "Referrals — AccsMarkets" };

export default async function ReferralsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Refer & Earn</h1>
      <Card>
        <p className="text-sm text-muted mb-4">
          Invite friends to AccsMarkets. When they complete their first escrow, you both earn a
          reward credited to your wallet.
        </p>
        <ReferralDashboard />
      </Card>
    </div>
  );
}
