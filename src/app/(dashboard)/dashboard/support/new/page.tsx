export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { NewTicketForm } from "@/components/support/NewTicketForm";
import type { SupportTicketCategory } from "@prisma/client";

export const metadata = { title: "New support ticket" };

const CATEGORY_KEYS: SupportTicketCategory[] = ["ACCOUNT", "PAYMENT", "ESCROW", "LISTING", "KYC", "TECHNICAL", "OTHER"];

export default async function NewSupportTicketPage({
  searchParams,
}: {
  searchParams: { escrowId?: string; listingId?: string; category?: string };
}) {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  // Only link things the user actually owns / is party to — anything else is silently dropped.
  const [escrow, listing] = await Promise.all([
    searchParams.escrowId
      ? prisma.escrow.findFirst({
          where: { id: searchParams.escrowId, OR: [{ buyerId: userId }, { sellerId: userId }] },
          select: { id: true, status: true, listing: { select: { title: true } } },
        })
      : null,
    searchParams.listingId
      ? prisma.listing.findFirst({
          where: { id: searchParams.listingId, sellerId: userId },
          select: { id: true, status: true, title: true },
        })
      : null,
  ]);

  const category = CATEGORY_KEYS.includes((searchParams.category ?? "") as SupportTicketCategory)
    ? (searchParams.category as SupportTicketCategory)
    : undefined;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 pb-8">
      <div>
        <Link href="/dashboard/support" className="mb-2 inline-flex items-center gap-1.5 text-sm text-brand-500 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          My tickets
        </Link>
        <h1 className="text-2xl font-black text-foreground">Open a support ticket</h1>
        <p className="mt-0.5 text-sm text-muted">Tell us what&apos;s going on and we&apos;ll reply within 24–48 hours.</p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-info/20 bg-info/5 px-4 py-3 text-sm">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
        <p className="text-muted">
          Many questions are answered instantly in the{" "}
          <Link href="/help" className="font-semibold text-info hover:underline">Help Center</Link>. For a problem with a specific deal,
          open the ticket from the escrow page so it&apos;s linked automatically.
        </p>
      </div>

      <Card>
        <NewTicketForm
          escrow={escrow ? { id: escrow.id, title: escrow.listing.title, status: escrow.status } : null}
          listing={listing}
          defaultCategory={category}
        />
      </Card>
    </div>
  );
}
