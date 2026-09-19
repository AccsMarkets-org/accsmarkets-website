"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface ExistingReview {
  rating: number;
  comment: string | null;
  reviewer: { username: string | null; name: string | null };
}

interface Props {
  escrowId: string;
  revieweeId: string;
  revieweeName: string;
  existing?: ExistingReview;
  counterpartyReview?: ExistingReview;
}

export function ReviewForm({ escrowId, revieweeId, revieweeName, existing, counterpartyReview }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  if (existing) {
    return (
      <Card>
        <h2 className="mb-3 font-semibold">Your review</h2>
        <StarRating value={existing.rating} size={20} />
        {existing.comment && <p className="mt-2 text-sm text-foreground">{existing.comment}</p>}
        {counterpartyReview && (
          <div className="mt-4 border-t border-surface-border pt-4">
            <p className="text-xs font-medium text-muted mb-2">{revieweeName}&apos;s review of you</p>
            <StarRating value={counterpartyReview.rating} size={16} />
            {counterpartyReview.comment && (
              <p className="mt-1 text-sm text-foreground">{counterpartyReview.comment}</p>
            )}
          </div>
        )}
      </Card>
    );
  }

  async function submit() {
    if (rating === 0) { toast.error("Please select a star rating"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escrowId, revieweeId, rating, comment: comment.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit review");
      toast.success("Review submitted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold">Leave a review for {revieweeName}</h2>
      <StarRating value={rating} onChange={setRating} size={24} />
      <Textarea
        className="mt-3"
        placeholder="Optional comment…"
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button className="mt-3" isLoading={loading} disabled={rating === 0} onClick={submit}>Submit review</Button>
    </Card>
  );
}
