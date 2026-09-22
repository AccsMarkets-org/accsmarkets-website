import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { SupportAdminClient } from "@/components/admin/SupportAdminClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support Tickets" };

export default async function AdminSupportPage({ searchParams }: { searchParams: { ticket?: string } }) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) redirect("/admin?denied=1");

  // Canned responses are read here (not via /api/admin/canned-responses, which
  // is gated on MANAGE_ESCROW_MESSAGES) so support staff without that
  // permission still get the picker.
  const canned = await prisma.cannedResponse.findMany({
    orderBy: { title: "asc" },
    select: { id: true, title: true, body: true },
  });

  return (
    <SupportAdminClient
      meId={session.user.id}
      cannedResponses={canned}
      initialTicketId={searchParams.ticket ?? null}
    />
  );
}
