import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldBan } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/ui/AdminPagination";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 50;

export default async function AdminFlaggedMessagesPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) redirect("/admin?denied=1");

  // Number("abc") is NaN and Math.max(0, NaN) is NaN, which Prisma rejects as `skip`.
  const pageRaw = Math.floor(Number(searchParams.page));
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 0;

  const [rawMessages, total] = await Promise.all([
    prisma.message.findMany({
      where: { moderationFlagged: true },
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      include: {
        // Message has no `recipient` relation (recipientId is a plain field) —
        // recipients are resolved separately below via a batched lookup.
        sender: { select: { id: true, username: true, name: true, email: true, isBanned: true } },
      },
    }),
    prisma.message.count({ where: { moderationFlagged: true } }),
  ]);

  const hasMore = rawMessages.length > PAGE_SIZE;
  const rawPage = hasMore ? rawMessages.slice(0, PAGE_SIZE) : rawMessages;

  const recipientIds = Array.from(new Set(rawPage.map((m) => m.recipientId)));
  const recipients = recipientIds.length
    ? await prisma.user.findMany({
        where: { id: { in: recipientIds } },
        select: { id: true, username: true, name: true, email: true },
      })
    : [];
  const recipientMap = new Map(recipients.map((r) => [r.id, r]));

  const messages = rawPage.map((m) => ({
    ...m,
    recipient: recipientMap.get(m.recipientId) ?? { id: m.recipientId, username: null, name: null, email: "Unknown user" },
  }));

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Flagged Messages"
        badge={total}
        badgeUrgent={total > 0}
        subtitle="Messages flagged by the moderation system for review"
      />

      <div className="flex flex-col gap-3">
        {messages.map((msg) => (
          <Card key={msg.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Link href={`/admin/users?q=${msg.sender.email}`} className="font-medium text-foreground hover:text-brand-600">
                    {msg.sender.username ?? msg.sender.name ?? msg.sender.email}
                  </Link>
                  <span className="text-muted">→</span>
                  <Link href={`/admin/users?q=${msg.recipient.email}`} className="font-medium text-foreground hover:text-brand-600">
                    {msg.recipient.username ?? msg.recipient.name ?? msg.recipient.email}
                  </Link>
                  {msg.sender.isBanned && (
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold uppercase text-danger">
                      Sender banned
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">{formatDate(msg.createdAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <AdminActionButtons
                  endpoint={`/api/admin/flagged-messages/${msg.id}`}
                  actions={[
                    { label: "Clear flag", action: "clear_flag", variant: "outline", method: "PATCH" },
                  ]}
                />
                {!msg.sender.isBanned && (
                  <Link
                    href={`/admin/users/${msg.sender.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger/5 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 transition"
                  >
                    <ShieldBan className="h-3.5 w-3.5" aria-hidden />
                    Ban sender
                  </Link>
                )}
              </div>
            </div>
            <p className="whitespace-pre-wrap rounded-xl border border-surface-border bg-surface p-3 text-sm text-foreground">
              {msg.content}
            </p>
          </Card>
        ))}
        {messages.length === 0 && (
          <p className="py-10 text-center text-muted">No flagged messages.</p>
        )}
      </div>

      <AdminPagination page={page} hasMore={hasMore} baseHref="/admin/flagged-messages" />
    </div>
  );
}
