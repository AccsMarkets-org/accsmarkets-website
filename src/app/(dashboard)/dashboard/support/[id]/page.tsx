export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Shield, Tag } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn, formatDate } from "@/lib/utils";
import { TicketThread } from "@/components/support/TicketThread";
import { TicketReplyBox } from "@/components/support/TicketReplyBox";
import { TicketStatusActions } from "@/components/support/TicketStatusActions";
import { CATEGORY_LABEL, REOPEN_WINDOW_DAYS, TICKET_STATUS_STYLE } from "@/components/support/constants";

export const metadata = { title: "Support ticket" };

export default async function SupportTicketPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: params.id, userId },
    include: {
      messages: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, username: true, image: true } } },
      },
    },
  });
  if (!ticket) notFound();

  const [escrow, listing] = await Promise.all([
    ticket.escrowId
      ? prisma.escrow.findFirst({
          where: { id: ticket.escrowId, OR: [{ buyerId: userId }, { sellerId: userId }] },
          select: { id: true, listing: { select: { title: true } } },
        })
      : null,
    ticket.listingId ? prisma.listing.findFirst({ where: { id: ticket.listingId, sellerId: userId }, select: { id: true, title: true } }) : null,
  ]);

  const style = TICKET_STATUS_STYLE[ticket.status];
  const withinReopenWindow =
    ticket.status === "RESOLVED" && !!ticket.resolvedAt && Date.now() - ticket.resolvedAt.getTime() <= REOPEN_WINDOW_DAYS * 86_400_000;
  const canReply = ticket.status !== "CLOSED" && (ticket.status !== "RESOLVED" || withinReopenWindow);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/dashboard/support" className="mb-2 inline-flex items-center gap-1.5 text-sm text-brand-500 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            My tickets
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-muted">#{ticket.number}</span>
            <h1 className="text-xl font-black text-foreground sm:text-2xl">{ticket.subject}</h1>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold", style.className)}>{style.userLabel}</span>
            <span className="rounded-md bg-surface px-1.5 py-0.5 font-medium">{CATEGORY_LABEL[ticket.category]}</span>
            <span>Opened {formatDate(ticket.createdAt)}</span>
            {ticket.resolvedAt && <span>· Resolved {formatDate(ticket.resolvedAt)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TicketStatusActions ticketId={ticket.id} status={ticket.status} canReopen={withinReopenWindow} />
        </div>
      </div>

      {(escrow || listing) && (
        <div className="flex flex-wrap gap-2">
          {escrow && (
            <Link href={`/dashboard/escrows/${escrow.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-brand-300">
              <Shield className="h-3.5 w-3.5 text-brand-500" aria-hidden />
              Escrow: <span className="max-w-[220px] truncate">{escrow.listing.title}</span>
            </Link>
          )}
          {listing && (
            <Link href={`/listings/${listing.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-brand-300">
              <Tag className="h-3.5 w-3.5 text-brand-500" aria-hidden />
              Listing: <span className="max-w-[220px] truncate">{listing.title}</span>
            </Link>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-surface-border bg-background p-4 sm:p-6">
        <TicketThread messages={ticket.messages} viewerId={userId} />
      </div>

      {canReply ? (
        <TicketReplyBox ticketId={ticket.id} reopens={ticket.status === "RESOLVED"} />
      ) : (
        <div className="rounded-2xl border border-dashed border-surface-border px-4 py-5 text-center text-sm text-muted">
          {ticket.status === "CLOSED"
            ? "This ticket has been closed by our team."
            : `This ticket was resolved more than ${REOPEN_WINDOW_DAYS} days ago.`}{" "}
          <Link href="/dashboard/support/new" className="font-semibold text-brand-500 hover:underline">Open a new ticket</Link> if you still need help.
        </div>
      )}
    </div>
  );
}
