"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface UserFields {
  username: string | null;
  email: string | null;
  name: string | null;
  bio: string | null;
}

interface Props {
  userId: string;
  user: UserFields;
}

export function AdminUserProfileEditor({ userId, user }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState(user.username ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [name, setName] = useState(user.name ?? "");
  const [bio, setBio] = useState(user.bio ?? "");

  async function save() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          username: username.trim() || undefined,
          email: email.trim() || undefined,
          name: name.trim() || undefined,
          bio: bio.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      toast.success("Profile updated");
      setEditing(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function cancel() {
    setUsername(user.username ?? "");
    setEmail(user.email ?? "");
    setName(user.name ?? "");
    setBio(user.bio ?? "");
    setEditing(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-surface-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <h2 className="font-bold text-foreground text-sm">Profile fields</h2>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500/10 border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-100"
          >
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M11.333 2a1.886 1.886 0 012.667 2.667L5.333 13.333 2 14l.667-3.333L11.333 2z"/>
            </svg>
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={cancel}
              className="rounded-xl border border-surface-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              {loading && <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              Save changes
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2">
        {[
          { label: "Username", value: username, setter: setUsername, placeholder: "username", hint: "2-30 chars, must be unique" },
          { label: "Email",    value: email,    setter: setEmail,    placeholder: "user@example.com", hint: "Must be unique" },
          { label: "Name",     value: name,     setter: setName,     placeholder: "Full name", hint: "Max 80 chars" },
        ].map(({ label, value, setter, placeholder, hint }) => (
          <div key={label} className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">{label}</label>
            {editing ? (
              <input
                className="h-9 w-full rounded-xl border border-surface-border bg-background px-3 text-base text-foreground placeholder:text-muted/60 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition sm:text-sm"
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
              />
            ) : (
              <div className="flex h-9 items-center rounded-xl border border-surface-border bg-surface px-3 text-sm text-foreground">
                {value || <span className="text-muted">—</span>}
              </div>
            )}
            {editing && <p className="text-[10px] text-muted">{hint}</p>}
          </div>
        ))}

        <div className={cn("flex flex-col gap-1.5", editing ? "" : "")}>
          <label className="text-xs font-semibold text-foreground">Bio</label>
          {editing ? (
            <>
              <textarea
                className="min-h-[72px] w-full resize-none rounded-xl border border-surface-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted/60 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition sm:text-sm"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={300}
                placeholder="Short bio..."
              />
              <p className="text-[10px] text-muted">{bio.length}/300</p>
            </>
          ) : (
            <div className="flex min-h-[40px] items-start rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm text-foreground">
              {bio || <span className="text-muted">—</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
