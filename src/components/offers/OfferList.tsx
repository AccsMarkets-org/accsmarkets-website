"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { OFFER_STATUS_STYLE } from "@/lib/constants";
import { cn, formatCurrency, relativeTime } from "@/lib/utils";

interface OfferItem {
  id: string;
  amount: string;
  message: string | null;
  status: keyof typeof OFFER_STATUS_STYLE;
  round: number;
  createdAt: string;
  listing: { id: string; title: string; price: string; status: string };
  buyerId: string;
  sellerId: string;
  buyer: { id: string; username: string | null; name: string | null };
  escrow: { id: string } | null;
}

export function OfferList({ initialType }: { initialType: "received" | "sent" }) {
  const [type, setType] = useState(initialType);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counteringId, setCounteringId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState("");

  const load = useCallback(async (t: "received" | "sent") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/offers?type=${t}`);
      if (!res.ok) throw new Error("Failed to load offers");
      const data = await res.json();
      setOffers(data.offers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load offers");
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(type);
  }, [type, load]);

  async function act(offerId: string, action: "accept" | "decline" | "cancel" | "counter", amount?: number) {
    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      toast.success(
        action === "accept"
          ? "Offer accepted"
          : action === "decline"
            ? "Offer declined"
            : action === "cancel"
              ? "Offer cancelled"
              : "Counter-offer sent",
      );
      setCounteringId(null);
      setCounterAmount("");
      load(type);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-fit gap-2 rounded-xl bg-surface p-1">
        <button
          onClick={() => setType("received")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition",
            type === "received" ? "bg-brand-500 text-white" : "text-muted",
          )}
        >
          Received
        </button>
        <button
          onClick={() => setType("sent")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition",
            type === "sent" ? "bg-brand-500 text-white" : "text-muted",
          )}
        >
          Sent
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">Loading…</p>
      ) : error ? (
        <p className="py-10 text-center text-sm text-danger">{error}</p>
      ) : offers.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No {type} offers yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {offers.map((offer) => {
            const style = OFFER_STATUS_STYLE[offer.status];
            return (
              <Card key={offer.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/listings/${offer.listing.id}`}
                      className="font-medium text-foreground hover:text-brand-600"
                    >
                      {offer.listing.title}
                    </Link>
                    <p className="text-sm text-muted">
                      {type === "received"
                        ? `From ${offer.buyer.username ?? offer.buyer.name}`
                        : `Listed at ${formatCurrency(offer.listing.price)}`}{" "}
                      · {relativeTime(offer.createdAt)}
                      {offer.round > 1 && ` · Round ${offer.round}`}
                    </p>
                    {offer.message && <p className="mt-1 text-sm text-muted">&ldquo;{offer.message}&rdquo;</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-foreground">{formatCurrency(offer.amount)}</span>
                    <StatusPill label={style.label} className={style.className} />
                  </div>
                </div>

                {offer.status === "PENDING" && type === "received" && counteringId !== offer.id && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => act(offer.id, "accept")}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCounteringId(offer.id)}>
                      Counter
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => act(offer.id, "decline")}>
                      Decline
                    </Button>
                  </div>
                )}

                {counteringId === offer.id && (
                  <div className="mt-3 flex items-end gap-2">
                    <Input
                      label="Counter amount (USD)"
                      type="number"
                      value={counterAmount}
                      onChange={(e) => setCounterAmount(e.target.value)}
                      className="max-w-[160px]"
                    />
                    <Button size="sm" onClick={() => act(offer.id, "counter", Number(counterAmount))}>
                      Send counter
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCounteringId(null)}>
                      Cancel
                    </Button>
                  </div>
                )}

                {offer.status === "PENDING" && type === "sent" && (
                  <div className="mt-3">
                    <Button size="sm" variant="outline" onClick={() => act(offer.id, "cancel")}>
                      Cancel offer
                    </Button>
                  </div>
                )}

                {offer.status === "ACCEPTED" && type === "received" && (
                  <div className="mt-3 flex gap-2">
                    <Link href={`/dashboard/messages/${offer.buyer.id}`}>
                      <Button size="sm" variant="outline">
                        <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                        </svg>
                        Chat with Buyer
                      </Button>
                    </Link>
                  </div>
                )}

                {offer.status === "ACCEPTED" && type === "sent" && !offer.escrow && (
                  <div className="mt-3 flex gap-2">
                    <Link href={`/checkout/${offer.listing.id}?offerId=${offer.id}&amount=${offer.amount}`}>
                      <Button size="sm">Start escrow</Button>
                    </Link>
                    <Link href={`/dashboard/messages/${offer.sellerId}`}>
                      <Button size="sm" variant="outline">
                        <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                        </svg>
                        Chat with Seller
                      </Button>
                    </Link>
                  </div>
                )}

                {offer.escrow && (
                  <div className="mt-3 flex gap-2">
                    <Link href={`/dashboard/escrows/${offer.escrow.id}`}>
                      <Button size="sm" variant="secondary">
                        View escrow
                      </Button>
                    </Link>
                    <Link href={`/dashboard/messages/${type === "sent" ? offer.sellerId : offer.buyer.id}`}>
                      <Button size="sm" variant="outline">
                        <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                        </svg>
                        Chat
                      </Button>
                    </Link>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
