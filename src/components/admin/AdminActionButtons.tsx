"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/hooks/useConfirm";
import { usePrompt } from "@/hooks/usePrompt";

interface ActionSpec {
  label: string;
  action: string;
  variant?: "primary" | "outline" | "danger" | "secondary";
  promptReason?: boolean;
  promptAmount?: boolean;
  promptTrustScore?: boolean;
  promptBadge?: boolean;
  promptAchievementBadge?: boolean;
  promptPlanId?: boolean;
  confirm?: string;
  method?: "PUT" | "PATCH" | "DELETE";
  /** When set, sent as the entire body instead of { action }. */
  body?: Record<string, unknown>;
}

/** Generic admin action row: PUT/PATCH/DELETEs to the given endpoint. */
export function AdminActionButtons({
  endpoint,
  actions,
  method: defaultMethod,
}: {
  endpoint: string;
  actions: ActionSpec[];
  method?: "PUT" | "PATCH" | "DELETE";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();
  const { promptInput, PromptDialog } = usePrompt();

  async function run(spec: ActionSpec) {
    if (spec.confirm) {
      const ok = await confirm({ title: spec.confirm, destructive: true });
      if (!ok) return;
    }

    const payload: Record<string, unknown> = { action: spec.action };
    if (spec.promptReason) {
      // Cancelling the dialog must abort. The prompt resolves null for both
      // cancel and an empty submit, so a blank reason aborts too — safer than
      // firing a reject/ban because the admin dismissed the box.
      const reason = await promptInput({ title: "Reason (recorded in the audit log):", placeholder: "Enter reason…" });
      if (reason === null) return;
      payload.reason = reason;
    }
    if (spec.promptAmount) {
      const raw = await promptInput({
        title: "Amount (positive to credit, negative to debit):",
        placeholder: "e.g. 50 or -10",
        type: "number",
      });
      if (raw === null) return;
      const amount = Number(raw);
      if (Number.isNaN(amount) || amount === 0) {
        toast.error("Enter a non-zero number");
        return;
      }
      payload.amount = amount;
    }
    if (spec.promptTrustScore) {
      const raw = await promptInput({
        title: "New trust score (0–100):",
        placeholder: "e.g. 75",
        type: "number",
      });
      if (raw === null) return;
      const trustScore = Number(raw);
      if (Number.isNaN(trustScore) || trustScore < 0 || trustScore > 100) {
        toast.error("Enter a number from 0 to 100");
        return;
      }
      payload.trustScore = trustScore;
    }
    if (spec.promptBadge) {
      const badge = (await promptInput({
        title: "Badge:",
        placeholder: "NONE, BLUE, GOLD or GREY",
      }))?.toUpperCase();
      if (!badge) return;
      if (!["NONE", "BLUE", "GOLD", "GREY"].includes(badge)) {
        toast.error("Invalid badge");
        return;
      }
      payload.badge = badge;
    }
    if (spec.promptAchievementBadge) {
      const ab = (await promptInput({
        title: "Achievement badge:",
        placeholder: "FIVE_STAR_SELLER, FAST_RESPONDER or TRUSTED_SELLER",
      }))?.toUpperCase();
      if (!ab) return;
      if (!["FIVE_STAR_SELLER", "FAST_RESPONDER", "TRUSTED_SELLER"].includes(ab)) {
        toast.error("Invalid achievement badge");
        return;
      }
      payload.achievementBadge = ab;
    }
    if (spec.promptPlanId) {
      const id = await promptInput({ title: "New plan ID:", placeholder: "e.g. pro" });
      if (!id) return;
      payload.planId = id;
    }

    setLoading(spec.action);
    const method = spec.method ?? defaultMethod ?? "PUT";
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "DELETE" ? undefined : JSON.stringify(spec.body ?? payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      toast.success(`${spec.label} — done`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      {ConfirmDialog}
      {PromptDialog}
      <div className="flex flex-wrap gap-2">
        {actions.map((spec) => (
          <Button
            key={spec.action}
            size="sm"
            variant={spec.variant ?? "outline"}
            isLoading={loading === spec.action}
            onClick={() => run(spec)}
          >
            {spec.label}
          </Button>
        ))}
      </div>
    </>
  );
}
