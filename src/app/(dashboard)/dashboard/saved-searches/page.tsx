import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { SavedSearchList } from "@/components/listings/SavedSearchList";

export const metadata = { title: "Saved Searches" };

export default async function SavedSearchesPage() {
  const session = await getServerSession(authOptions);
  const searches = await prisma.savedSearch.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Saved searches</h1>
        <p className="mt-1 text-sm text-muted">
          Quickly re-run past searches and get alerted when new listings match.
        </p>
      </div>

      {searches.length === 0 ? (
        <Card>
          <p className="text-center text-muted py-10">
            No saved searches yet. Use the filter bar on the{" "}
            <a href="/listings" className="text-brand-600 hover:underline">
              browse page
            </a>{" "}
            and click &quot;Save search&quot;.
          </p>
        </Card>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <SavedSearchList initialSearches={(searches as any[]).map((s) => ({ ...s, filters: s.filters as Record<string, string> }))} />
      )}
    </div>
  );
}
