"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface DashboardViewToggleProps {
  defaultView: "BUYER" | "SELLER";
}

const BuyerIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9M9 22a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" />
  </svg>
);

const SellerIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

export function DashboardViewToggle({ defaultView }: DashboardViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL immediately on client so highlight updates without waiting for server re-render
  const urlView = searchParams.get("view") as "BUYER" | "SELLER" | null;
  const activeView = urlView ?? defaultView;

  function switchView(view: "BUYER" | "SELLER") {
    if (view === activeView) return;
    router.push(`/dashboard?view=${view}`);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted whitespace-nowrap">
        Switch view:
      </span>
      <div className="flex items-center rounded-full border border-surface-border bg-surface p-0.5">
        <button
          type="button"
          onClick={() => switchView("BUYER")}
          className={[
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all",
            activeView === "BUYER"
              ? "bg-brand-500 text-white shadow-sm"
              : "text-muted hover:text-foreground",
          ].join(" ")}
        >
          <BuyerIcon />
          <span>Buyer</span>
        </button>
        <button
          type="button"
          onClick={() => switchView("SELLER")}
          className={[
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all",
            activeView === "SELLER"
              ? "bg-brand-500 text-white shadow-sm"
              : "text-muted hover:text-foreground",
          ].join(" ")}
        >
          <SellerIcon />
          <span>Seller</span>
        </button>
      </div>
    </div>
  );
}
