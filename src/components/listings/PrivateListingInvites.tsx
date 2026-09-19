"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Invite {
  id: string;
  createdAt: string;
  invitedUser: { id: string; username: string | null; name: string | null; image: string | null };
}

export function PrivateListingInvites({ listingId }: { listingId: string }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [inviting, setInviting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/listings/${listingId}/invite`)
      .then((r) => r.json())
      .then((d) => setInvites(d.invites ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [listingId]);

  useEffect(() => { load(); }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to invite");
      toast.success(`Invited ${username.trim()}`);
      setUsername("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  }

  async function revoke(invitedUserId: string) {
    setRevokingId(invitedUserId);
    try {
      const res = await fetch(`/api/listings/${listingId}/invite?userId=${invitedUserId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke");
      setInvites((prev) => prev.filter((i) => i.invitedUser.id !== invitedUserId));
    } catch {
      toast.error("Failed to revoke invite");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Invited buyers</p>
        <p className="mt-0.5 text-xs text-muted">
          This listing is private — only people you invite here can view or buy it.
        </p>
      </div>

      <form onSubmit={invite} className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username to invite"
          />
        </div>
        <Button type="submit" isLoading={inviting} disabled={!username.trim()}>
          Invite
        </Button>
      </form>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-surface" />)}
        </div>
      ) : invites.length === 0 ? (
        <p className="rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-xs text-muted">
          No one invited yet — this listing isn&apos;t visible to anyone but you.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                {invite.invitedUser.image ? (
                  <img src={invite.invitedUser.image} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                    {(invite.invitedUser.username ?? invite.invitedUser.name ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="truncate text-sm font-medium text-foreground">
                  {invite.invitedUser.username ?? invite.invitedUser.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => revoke(invite.invitedUser.id)}
                disabled={revokingId === invite.invitedUser.id}
                className="shrink-0 text-xs font-medium text-danger hover:underline disabled:opacity-50"
              >
                {revokingId === invite.invitedUser.id ? "Removing…" : "Revoke"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
