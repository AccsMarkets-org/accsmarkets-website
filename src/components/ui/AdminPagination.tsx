import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface Props {
  page: number;
  hasMore: boolean;
  baseHref: string;
  extraParams?: Record<string, string | undefined>;
}

function buildHref(baseHref: string, page: number, extra?: Record<string, string | undefined>): string {
  const params = new URLSearchParams({ page: String(page) });
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.set(k, v);
    }
  }
  return `${baseHref}?${params.toString()}`;
}

export function AdminPagination({ page, hasMore, baseHref, extraParams }: Props) {
  if (page === 0 && !hasMore) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      {page > 0 ? (
        <Link
          href={buildHref(baseHref, page - 1, extraParams)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-4 py-1.5 text-sm font-medium hover:bg-surface-border transition"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Previous
        </Link>
      ) : (
        <div />
      )}
      <span className="text-xs text-muted">Page {page + 1}</span>
      {hasMore ? (
        <Link
          href={buildHref(baseHref, page + 1, extraParams)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-4 py-1.5 text-sm font-medium hover:bg-surface-border transition"
        >
          Next
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
