import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings/SettingsNav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto flex max-w-4xl gap-6 flex-col sm:flex-row">
      <SettingsNav />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
