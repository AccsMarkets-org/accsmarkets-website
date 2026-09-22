"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/hooks/useConfirm";
import { usePrompt } from "@/hooks/usePrompt";

type Payload =
  | { action: "recompute" }
  | { action: "force_signout"; reason?: string }
  | { action: "resolve" | "dismiss"; flagId: string; note?: string };

function useRiskAction(userId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, payload: Payload, successMsg: string) {
    setBusy(key);
    try {
      const res = await fetch(`/api/admin/risk/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      toast.success(successMsg);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  return { busy, run };
}

/** Header-level actions: recompute score, force sign-out everywhere. */
export function RiskCaseActions({ userId }: { userId: string }) {
  const { busy, run } = useRiskAction(userId);
  const { confirm, ConfirmDialog } = useConfirm();
  const { promptInput, PromptDialog } = usePrompt();

  async function forceSignOut() {
    const ok = await confirm({
      title: "Force sign-out everywhere?",
      description: "Every device signed in to this account will be logged out within about a minute.",
      confirmLabel: "Sign out all devices",
      destructive: true,
    });
    if (!ok) return;
    const reason = await promptInput({ title: "Reason (optional):", placeholder: "e.g. suspected account takeover" });
    await run("force_signout", { action: "force_signout", reason: reason ?? undefined }, "All sessions invalidated");
  }

  return (
    <>
      {ConfirmDialog}
      {PromptDialog}
      <Button
        size="sm"
        variant="outline"
        isLoading={busy === "recompute"}
        onClick={() => run("recompute", { action: "recompute" }, "Risk score recomputed")}
      >
        Recompute score
      </Button>
      <Button size="sm" variant="danger" isLoading={busy === "force_signout"} onClick={forceSignOut}>
        Force sign-out everywhere
      </Button>
    </>
  );
}

/** Per-flag Resolve / Dismiss buttons with an optional note. */
export function FlagActions({ userId, flagId }: { userId: string; flagId: string }) {
  const { busy, run } = useRiskAction(userId);
  const { promptInput, PromptDialog } = usePrompt();

  async function close(action: "resolve" | "dismiss") {
    const note = await promptInput({
      title: action === "resolve" ? "Resolution note (optional):" : "Dismissal note (optional):",
      placeholder: "What was checked / why it's not an issue",
    });
    await run(action, { action, flagId, note: note ?? undefined }, action === "resolve" ? "Flag resolved" : "Flag dismissed");
  }

  return (
    <>
      {PromptDialog}
      <div className="flex shrink-0 items-center gap-1.5">
        <Button size="sm" variant="primary" isLoading={busy === "resolve"} onClick={() => close("resolve")}>
          Resolve
        </Button>
        <Button size="sm" variant="outline" isLoading={busy === "dismiss"} onClick={() => close("dismiss")}>
          Dismiss
        </Button>
      </div>
    </>
  );
}
