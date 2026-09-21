"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";

interface OrgMember {
  userId: string;
  role: string;
  joinedAt: string | null;
  user: { id: string; username: string | null; email: string; verifiedBadge: string };
}

interface KybSubmission {
  id: string;
  status: string;
  businessName: string;
  country: string;
  rejectionReason: string | null;
  createdAt: string;
}

interface Org {
  id: string;
  name: string;
  ownerId: string;
  kybStatus: string;
  myRole: string;
  members: OrgMember[];
  kybSubmission: KybSubmission | null;
}

export default function OrganizationPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);
  const [kybStep, setKybStep] = useState<"idle" | "form">("idle");

  const [kybForm, setKybForm] = useState({
    businessName: "",
    registrationNumber: "",
    country: "",
    regDocUrl: "",
    utilityBillUrl: "",
  });
  const [owners, setOwners] = useState([{ name: "", ownershipPct: 100 }]);
  const [inviteUsername, setInviteUsername] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/organizations");
      const data = await res.json();
      setOrgs(data.orgs ?? []);
      if (data.orgs?.length && !activeOrg) setActiveOrg(data.orgs[0]);
    } catch {
      toast.error("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function createOrg() {
    if (!newOrgName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Organization created!");
      setNewOrgName("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  async function inviteMember() {
    if (!activeOrg || !inviteUsername.trim()) return;
    try {
      const res = await fetch(`/api/organizations/${activeOrg.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: inviteUsername, role: "MEMBER" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Member invited!");
      setInviteUsername("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function changeRole(userId: string, role: "ADMIN" | "MEMBER") {
    if (!activeOrg) return;
    try {
      const res = await fetch(`/api/organizations/${activeOrg.id}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Role updated to ${role}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function removeMember(userId: string) {
    if (!activeOrg) return;
    try {
      const res = await fetch(`/api/organizations/${activeOrg.id}/members/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Member removed");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function submitKyb() {
    if (!activeOrg) return;
    try {
      const res = await fetch(`/api/organizations/${activeOrg.id}/kyb`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...kybForm,
          beneficialOwners: owners.map((o) => ({ name: o.name, ownershipPct: Number(o.ownershipPct) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("KYB submitted for review!");
      setKybStep("idle");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  const KYB_STATUS_LABEL: Record<string, string> = {
    NONE: "Not started",
    SUBMITTED: "Under review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };

  if (loading) {
    return <div className="py-20 text-center text-muted">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organizations</h1>
      </div>

      {/* Create org */}
      <Card>
        <p className="mb-3 text-sm font-medium">Create a new organization</p>
        <div className="flex gap-2">
          <Input
            placeholder="Organization name"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            className="flex-1"
          />
          <Button isLoading={creating} onClick={createOrg} disabled={!newOrgName.trim()}>
            Create
          </Button>
        </div>
      </Card>

      {orgs.length === 0 && (
        <p className="text-center text-sm text-muted py-8">You are not a member of any organization yet.</p>
      )}

      {/* Org selector */}
      {orgs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => setActiveOrg(org)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                activeOrg?.id === org.id
                  ? "border-brand-500 bg-brand-500/10 text-brand-700"
                  : "border-surface-border text-muted hover:border-brand-300"
              }`}
            >
              {org.name}
            </button>
          ))}
        </div>
      )}

      {activeOrg && (
        <>
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{activeOrg.name}</h2>
                <p className="text-sm text-muted">Your role: {activeOrg.myRole}</p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  activeOrg.kybStatus === "APPROVED"
                    ? "bg-success/10 text-success"
                    : activeOrg.kybStatus === "REJECTED"
                      ? "bg-danger/10 text-danger"
                      : activeOrg.kybStatus === "SUBMITTED"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                        : "bg-surface-border text-muted"
                }`}
              >
                KYB: {KYB_STATUS_LABEL[activeOrg.kybStatus] ?? activeOrg.kybStatus}
                {activeOrg.kybStatus === "APPROVED" && <Check className="h-3.5 w-3.5" aria-hidden />}
              </span>
            </div>

            {/* KYB action */}
            {activeOrg.kybStatus !== "APPROVED" && (activeOrg.myRole === "OWNER" || activeOrg.myRole === "ADMIN") && (
              <div className="mt-4">
                {activeOrg.kybSubmission?.rejectionReason && (
                  <div className="mb-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
                    Rejection reason: {activeOrg.kybSubmission.rejectionReason}
                  </div>
                )}
                {kybStep === "idle" ? (
                  <Button variant="outline" onClick={() => setKybStep("form")}>
                    {activeOrg.kybStatus === "NONE" ? "Submit KYB verification" : "Re-submit KYB"}
                  </Button>
                ) : (
                  <div className="space-y-3 rounded-xl border border-surface-border p-4">
                    <p className="font-medium text-sm">Business verification</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Business name" value={kybForm.businessName} onChange={(e) => setKybForm({ ...kybForm, businessName: e.target.value })} />
                      <Input label="Registration number" value={kybForm.registrationNumber} onChange={(e) => setKybForm({ ...kybForm, registrationNumber: e.target.value })} />
                      <Input label="Country (2-letter)" maxLength={2} value={kybForm.country} onChange={(e) => setKybForm({ ...kybForm, country: e.target.value.toUpperCase() })} />
                      <Input label="Registration doc URL" value={kybForm.regDocUrl} onChange={(e) => setKybForm({ ...kybForm, regDocUrl: e.target.value })} />
                      <Input label="Utility bill URL" value={kybForm.utilityBillUrl} onChange={(e) => setKybForm({ ...kybForm, utilityBillUrl: e.target.value })} />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Beneficial owners</p>
                      {owners.map((o, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <Input placeholder="Name" value={o.name} onChange={(e) => setOwners(owners.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="flex-1" />
                          <Input type="number" placeholder="%" value={o.ownershipPct} onChange={(e) => setOwners(owners.map((x, j) => j === i ? { ...x, ownershipPct: Number(e.target.value) } : x))} className="w-20" />
                          {owners.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              aria-label={`Remove owner ${o.name || i + 1}`}
                              onClick={() => setOwners(owners.filter((_, j) => j !== i))}
                              className="shrink-0 focus:outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100"
                            >
                              <X className="h-4 w-4" aria-hidden />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button variant="outline" onClick={() => setOwners([...owners, { name: "", ownershipPct: 0 }])} className="text-xs">
                        + Add owner
                      </Button>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setKybStep("idle")}>Cancel</Button>
                      <Button onClick={submitKyb} disabled={!kybForm.businessName || !kybForm.country}>Submit</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Members */}
          <Card>
            <p className="mb-3 font-medium">Members ({activeOrg.members.length})</p>
            <div className="space-y-2">
              {activeOrg.members.map((m) => (
                <div key={m.userId} className="flex items-center justify-between rounded-xl bg-background px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{m.user.username ?? m.user.email}</p>
                    <p className="text-xs text-muted">{m.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Only the OWNER can change roles — matches the backend's
                        PATCH .../members/[userId] check, which rejects the
                        request from an org ADMIN even though ADMINs can
                        already remove members below. */}
                    {m.role !== "OWNER" && activeOrg.myRole === "OWNER" && (
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m.userId, e.target.value as "ADMIN" | "MEMBER")}
                        className="rounded-lg border border-surface-border bg-background px-2 py-1 text-xs text-foreground"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    )}
                    {m.role !== "OWNER" && (activeOrg.myRole === "OWNER" || activeOrg.myRole === "ADMIN") && (
                      <Button variant="outline" onClick={() => removeMember(m.userId)} className="text-xs text-danger">
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {(activeOrg.myRole === "OWNER" || activeOrg.myRole === "ADMIN") && (
              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="Username to invite"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={inviteMember} disabled={!inviteUsername.trim()}>Invite</Button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
