"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { cn } from "@/lib/utils";

interface PoolEmail {
  id: string;
  address: string;
  platform: string;
  status: string;
  notes: string | null;
  addedAsManagerAt: string | null;
  createdAt: string;
  escrow: { id: string; status: string; listingTitle: string } | null;
}

const STATUS_STYLE: Record<string, string> = {
  AVAILABLE: "bg-success/10 text-success",
  IN_USE:    "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400",
  FLAGGED:   "bg-danger/10 text-danger",
};

export function EscrowEmailPool({
  emails: initialEmails,
  platforms,
}: {
  emails: PoolEmail[];
  platforms: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [emails, setEmails] = useState(initialEmails);
  const [loading, setLoading] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState("");
  const [newPlatform, setNewPlatform] = useState(platforms[0]?.value ?? "");
  const [adding, setAdding] = useState(false);

  async function patchEmail(id: string, action: string, label: string) {
    setLoading(id + action);
    try {
      const res = await fetch(`/api/admin/escrow-emails/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      toast.success(label);
      router.refresh();
      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: data.email.status } : e)),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/admin/escrow-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: newAddress, platform: newPlatform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add email");
      toast.success("Email added to pool");
      setNewAddress("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Add email form */}
      <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <Input
            label="Email address"
            type="email"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="escrow@example.com"
          />
        </div>
        <div className="min-w-40">
          <label className="mb-1.5 block text-sm font-medium">Platform</label>
          <select
            value={newPlatform}
            onChange={(e) => setNewPlatform(e.target.value)}
            className="h-10 w-full rounded-xl border border-surface-border bg-background px-3 text-base sm:text-sm"
          >
            {platforms.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <Button type="submit" isLoading={adding} disabled={!newAddress}>
          Add email
        </Button>
      </form>

      {/* Table */}
      {emails.length === 0 ? (
        <p className="text-sm text-muted">No emails in the pool yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="pb-2 pr-4">Address</th>
                <th className="pb-2 pr-4">Platform</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Assigned escrow</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <tr key={email.id} className="border-b border-surface-border/50 last:border-0">
                  <td className="py-2 pr-4 font-mono text-xs">{email.address}</td>
                  <td className="py-2 pr-4">{platforms.find((p) => p.value === email.platform)?.label ?? email.platform}</td>
                  <td className="py-2 pr-4">
                    <StatusPill
                      label={email.status}
                      className={cn("text-[11px]", STATUS_STYLE[email.status] ?? "bg-muted/10 text-muted")}
                    />
                  </td>
                  <td className="py-2 pr-4">
                    {email.escrow ? (
                      <Link
                        href={`/admin/escrows/${email.escrow.id}`}
                        className="text-brand-600 hover:underline text-xs"
                      >
                        {email.escrow.listingTitle} ({email.escrow.status})
                      </Link>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      {email.status !== "FLAGGED" ? (
                        <button
                          className="text-xs text-danger hover:underline"
                          onClick={() => patchEmail(email.id, "flag", "Email flagged")}
                          disabled={loading === email.id + "flag"}
                        >
                          Flag
                        </button>
                      ) : (
                        <button
                          className="text-xs text-brand-600 hover:underline"
                          onClick={() => patchEmail(email.id, "unflag", "Email unflagged")}
                          disabled={loading === email.id + "unflag"}
                        >
                          Unflag
                        </button>
                      )}
                      {email.status === "IN_USE" && (
                        <button
                          className="text-xs text-warning hover:underline"
                          onClick={() => patchEmail(email.id, "release", "Email released")}
                          disabled={loading === email.id + "release"}
                        >
                          Release
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
