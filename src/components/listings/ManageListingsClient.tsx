"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { Listing } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/hooks/useConfirm";
import { ListingManageCard } from "@/components/listings/ListingManageCard";
import { Check, DollarSign, Pause, Play, RotateCcw, Trash2, X } from "lucide-react";

type ListingWithCounts = Listing & {
  _count: { offers: number; bids: number };
};

type BulkAction = "pause" | "unpause" | "mark_sold" | "relist" | "delete" | "price";

interface BulkResult {
  done: string[];
  skipped: { id: string; reason: string }[];
}

interface Props {
  listings: ListingWithCounts[];
}

const ACTION_LABEL: Record<BulkAction, string> = {
  pause: "paused",
  unpause: "resumed",
  mark_sold: "marked as sold",
  relist: "relisted",
  delete: "deleted",
  price: "repriced",
};

export function ManageListingsClient({ listings }: Props) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<BulkAction | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);

  const pageIds = useMemo(() => listings.map((l) => l.id), [listings]);
  // Drop ids that disappeared after a refresh (deleted / filtered out).
  const selectedOnPage = useMemo(
    () => pageIds.filter((id) => selected.has(id)),
    [pageIds, selected],
  );
  const allSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;

  // Which bulk actions make sense for the current selection (at least one eligible).
  const eligibility = useMemo(() => {
    const rows = listings.filter((l) => selected.has(l.id));
    const has = (pred: (l: ListingWithCounts) => boolean) => rows.some(pred);
    return {
      pause: has((l) => l.status === "ACTIVE"),
      unpause: has((l) => l.status === "PAUSED"),
      mark_sold: has((l) => l.status === "ACTIVE" || l.status === "PAUSED"),
      relist: has((l) => l.status === "SOLD"),
      delete: has((l) => ["DRAFT", "PENDING", "REJECTED", "EXPIRED", "ACTIVE", "PAUSED"].includes(l.status)),
      price: has((l) => ["DRAFT", "PENDING", "REJECTED", "ACTIVE", "PAUSED"].includes(l.status)),
    };
  }, [listings, selected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function runBulk(action: BulkAction, price?: { mode: "set" | "percent"; value: number }) {
    const ids = selectedOnPage;
    if (ids.length === 0) return;
    setBusy(action);
    try {
      const res = await fetch("/api/listings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action, ...(price ? { price } : {}) }),
      });
      const data = (await res.json().catch(() => null)) as (BulkResult & { error?: string }) | null;
      if (!res.ok || !data) throw new Error(data?.error ?? "Bulk action failed");

      const n = data.done.length;
      const s = data.skipped.length;
      if (n > 0) {
        toast.success(`${n} listing${n === 1 ? "" : "s"} ${ACTION_LABEL[action]}${s ? ` · ${s} skipped` : ""}`);
      } else if (s > 0) {
        toast.error(`Nothing changed — ${data.skipped[0].reason}`);
      }
      // Keep only skipped ones selected so the seller can see what didn't apply.
      setSelected(new Set(data.skipped.map((x) => x.id)));
      setPriceOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function confirmAndRun(action: Exclude<BulkAction, "price">) {
    const n = selectedOnPage.length;
    const copy: Record<typeof action, { title: string; description: string; label: string; destructive: boolean }> = {
      pause: {
        title: `Pause ${n} listing${n === 1 ? "" : "s"}?`,
        description: "They will be hidden from buyers until resumed. Only active listings are affected.",
        label: "Pause",
        destructive: false,
      },
      unpause: {
        title: `Resume ${n} listing${n === 1 ? "" : "s"}?`,
        description: "Paused listings go live again immediately — no admin review needed.",
        label: "Resume",
        destructive: false,
      },
      mark_sold: {
        title: `Mark ${n} listing${n === 1 ? "" : "s"} as sold?`,
        description: "Active or paused listings will move to Sold. Others are skipped.",
        label: "Mark Sold",
        destructive: false,
      },
      relist: {
        title: `Relist ${n} listing${n === 1 ? "" : "s"}?`,
        description: "Sold listings will be set back to Active. Others are skipped.",
        label: "Relist",
        destructive: false,
      },
      delete: {
        title: `Delete ${n} listing${n === 1 ? "" : "s"}?`,
        description:
          "This cannot be undone. Listings with an escrow (open or completed) are skipped; pending offers on the others are removed.",
        label: "Delete",
        destructive: true,
      },
    };
    const c = copy[action];
    const ok = await confirm({ title: c.title, description: c.description, confirmLabel: c.label, destructive: c.destructive });
    if (!ok) return;
    await runBulk(action);
  }

  const count = selectedOnPage.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Select-all row */}
      {listings.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-1">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              aria-label="Select all listings on this page"
              className="h-4 w-4 rounded border-surface-border text-brand-500 focus:ring-brand-500"
            />
            Select all on page
            {count > 0 && <span className="text-foreground">({count} selected)</span>}
          </label>
          {count > 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs text-muted hover:text-foreground transition"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Cards */}
      {listings.map((listing) => (
        <ListingManageCard
          key={listing.id}
          listing={listing}
          pendingOfferCount={listing._count.offers}
          bidCount={listing._count.bids}
          selectable
          selected={selected.has(listing.id)}
          onToggle={toggle}
        />
      ))}

      {/* Sticky bulk bar */}
      {count > 0 && (
        <div className="sticky bottom-3 z-30 mt-2">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 rounded-2xl border border-brand-300 bg-background/95 px-3 py-2.5 shadow-xl backdrop-blur dark:border-brand-700">
            <span className="mr-1 rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-bold text-white">
              {count} selected
            </span>

            <Button variant="outline" size="sm" disabled={!eligibility.pause || busy !== null} isLoading={busy === "pause"} onClick={() => confirmAndRun("pause")}>
              <Pause className="h-4 w-4" aria-hidden />
              Pause
            </Button>
            <Button variant="outline" size="sm" disabled={!eligibility.unpause || busy !== null} isLoading={busy === "unpause"} onClick={() => confirmAndRun("unpause")}>
              <Play className="h-4 w-4" aria-hidden />
              Resume
            </Button>
            <Button variant="outline" size="sm" disabled={!eligibility.mark_sold || busy !== null} isLoading={busy === "mark_sold"} onClick={() => confirmAndRun("mark_sold")}>
              <Check className="h-4 w-4" aria-hidden />
              Mark sold
            </Button>
            <Button variant="outline" size="sm" disabled={!eligibility.relist || busy !== null} isLoading={busy === "relist"} onClick={() => confirmAndRun("relist")}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Relist
            </Button>
            <Button variant="outline" size="sm" disabled={!eligibility.price || busy !== null} onClick={() => setPriceOpen(true)}>
              <DollarSign className="h-4 w-4" aria-hidden />
              Adjust price
            </Button>
            <Button variant="danger" size="sm" disabled={!eligibility.delete || busy !== null} isLoading={busy === "delete"} onClick={() => confirmAndRun("delete")}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Delete
            </Button>

            <button
              type="button"
              onClick={() => setSelected(new Set())}
              aria-label="Clear selection"
              className="ml-auto rounded-lg p-1.5 text-muted hover:bg-surface-border hover:text-foreground transition"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {priceOpen && (
        <BulkPriceModal
          count={count}
          loading={busy === "price"}
          onClose={() => setPriceOpen(false)}
          onSubmit={(p) => runBulk("price", p)}
        />
      )}
      {ConfirmDialog}
    </div>
  );
}

// ── Adjust price modal ────────────────────────────────────────────────────────

function BulkPriceModal({
  count,
  loading,
  onClose,
  onSubmit,
}: {
  count: number;
  loading: boolean;
  onClose: () => void;
  onSubmit: (p: { mode: "set" | "percent"; value: number }) => void;
}) {
  const [mode, setMode] = useState<"set" | "percent">("percent");
  const [raw, setRaw] = useState("");
  const value = Number(raw);
  const valid =
    raw.trim() !== "" &&
    Number.isFinite(value) &&
    (mode === "set" ? value >= 1 && value <= 1_000_000 : value > -100 && value <= 1000 && value !== 0);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-price-title"
        className="fixed inset-x-4 top-1/2 z-50 max-w-md -translate-y-1/2 rounded-2xl bg-background p-6 shadow-xl sm:inset-x-auto sm:left-1/2 sm:w-full sm:-translate-x-1/2"
      >
        <h2 id="bulk-price-title" className="mb-1 text-lg font-bold">Adjust price</h2>
        <p className="mb-4 text-xs text-muted">
          Applies to {count} selected listing{count === 1 ? "" : "s"}. Sold, expired and suspended listings are skipped.
        </p>

        <div className="mb-3 grid grid-cols-2 gap-2">
          {(
            [
              { key: "percent", label: "Change by %", hint: "e.g. -10 or 15" },
              { key: "set", label: "Set exact price", hint: "e.g. 249.99" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => { setMode(opt.key); setRaw(""); }}
              className={`rounded-xl border p-3 text-left transition ${
                mode === opt.key
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30"
                  : "border-surface-border hover:border-brand-300"
              }`}
            >
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs text-muted">{opt.hint}</p>
            </button>
          ))}
        </div>

        <label className="block text-xs font-medium text-muted mb-1" htmlFor="bulk-price-value">
          {mode === "percent" ? "Percentage (negative to discount)" : "New price (USD)"}
        </label>
        <div className="relative mb-4">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">
            {mode === "percent" ? "%" : "$"}
          </span>
          <input
            id="bulk-price-value"
            type="number"
            inputMode="decimal"
            step={mode === "percent" ? 1 : 0.01}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={mode === "percent" ? "-10" : "99.00"}
            className="w-full rounded-xl border border-surface-border bg-surface py-2 pl-8 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!valid} isLoading={loading} onClick={() => onSubmit({ mode, value })}>
            Apply to {count}
          </Button>
        </div>
      </div>
    </>
  );
}
