"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";

const OPTIONS = [
  { type: "FEATURED_BOOST",   label: "Featured Boost",    price: "$9.99",  duration: "7 days",  benefit: "Appears above regular listings" },
  { type: "PREMIUM_FEATURED", label: "Premium Featured",  price: "$19.99", duration: "14 days", benefit: "Top position + highlighted border" },
  { type: "PINNED",           label: "Pinned",            price: "$4.99",  duration: "7 days",  benefit: "Pinned at top of category" },
  { type: "BUMP",             label: "Bump",              price: "$2.00",  duration: "1×",      benefit: "Reset listing to top (24h cooldown)" },
] as const;

type PromotionType = typeof OPTIONS[number]["type"];

interface Props {
  listingId: string;
  onClose: () => void;
}

export function PromoteModal({ listingId, onClose }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<PromotionType | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Promotion applied!");
      router.refresh();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 z-50 max-w-md -translate-y-1/2 rounded-2xl bg-background p-6 shadow-xl sm:inset-x-auto sm:left-1/2 sm:w-full sm:-translate-x-1/2">
        <h2 className="mb-4 text-lg font-bold">Promote listing</h2>
        <div className="flex flex-col gap-2 mb-4">
          {OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => setSelected(opt.type)}
              className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${
                selected === opt.type
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30"
                  : "border-surface-border hover:border-brand-300"
              }`}
            >
              <div>
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted">{opt.benefit}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-bold">{opt.price}</p>
                <p className="text-xs text-muted">{opt.duration}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!selected} isLoading={loading} onClick={submit}>Apply promotion</Button>
        </div>
      </div>
    </>
  );
}
