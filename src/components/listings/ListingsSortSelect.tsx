"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function ListingsSortSelect({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", e.target.value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      className="rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      <option value="newest">Newest first</option>
      <option value="views">Most views</option>
      <option value="price_desc">Price: high → low</option>
      <option value="price_asc">Price: low → high</option>
    </select>
  );
}
