import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDate, formatCurrency } from "@/lib/utils";

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  OPEN:     { label: "Open",     className: "bg-success/10 text-success" },
  MATCHED:  { label: "Matched",  className: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400" },
  CLOSED:   { label: "Closed",   className: "bg-muted/10 text-muted" },
  EXPIRED:  { label: "Expired",  className: "bg-danger/10 text-danger" },
};

export default async function WantedListingsPage() {
  const session = await getServerSession(authOptions);
  const items = await prisma.wantedListing.findMany({
    where: { buyerId: session!.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Wanted Listings</h1>
        <Link
          href="/dashboard/wanted/new"
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition"
        >
          + New wanted listing
        </Link>
      </div>

      {items.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-3xl mb-2">🔍</p>
          <p className="font-medium">No wanted listings yet</p>
          <p className="mt-1 text-sm text-muted">Post what you&apos;re looking for and sellers will reach out.</p>
          <Link
            href="/dashboard/wanted/new"
            className="mt-4 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition"
          >
            Post a wanted listing
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const style = STATUS_STYLE[item.status] ?? STATUS_STYLE.OPEN;
            return (
              <Card key={item.id} className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {item.platform ? `${item.platform} · ` : ""}
                    {item.budget ? `Budget: ${formatCurrency(Number(item.budget))} · ` : ""}
                    Posted {formatDate(item.createdAt)}
                  </p>
                </div>
                <StatusPill label={style.label} className={style.className} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
