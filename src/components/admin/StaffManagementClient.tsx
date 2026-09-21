"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { PERMISSION_GROUPS, PERMISSION_LABELS, STAFF_ROLE_PRESETS, ALL_PERMISSIONS, type Permission } from "@/lib/permissions";
import { ArrowRight } from "lucide-react";

interface StaffRole {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  _count: { users: number };
}

interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  image: string | null;
  staffRoleId: string | null;
  staffRole: { id: string; name: string } | null;
  lastSeenAt: string | null;
  createdAt: string;
}

interface SearchUser {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  image: string | null;
}

function timeAgo(date: string | null): string {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Avatar({ name, image, size = 10, className = "" }: { name: string; image: string | null; size?: number; className?: string }) {
  const sizeClass = size === 8 ? "h-8 w-8" : size === 10 ? "h-10 w-10" : size === 12 ? "h-12 w-12" : `h-${size} w-${size}`;
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt={name} className={`${sizeClass} rounded-full object-cover ${className}`} />
  ) : (
    <span className={`flex ${sizeClass} items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white text-sm font-bold shadow-sm ${className}`}>
      {name[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

function OnlineIndicator({ lastSeenAt }: { lastSeenAt: string | null }) {
  if (!lastSeenAt) return null;
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  const isOnline = diff < 5 * 60 * 1000; // 5 minutes
  const isRecent = diff < 30 * 60 * 1000; // 30 minutes

  return (
    <span
      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
        isOnline ? "bg-success" : isRecent ? "bg-warning" : "bg-surface-border"
      }`}
      title={isOnline ? "Online now" : isRecent ? "Active recently" : `Last seen ${timeAgo(lastSeenAt)}`}
    />
  );
}

function PermissionGrouped({
  selected,
  toggle,
  selectAll,
}: {
  selected: Set<string>;
  toggle: (p: string) => void;
  selectAll: (perms: string[], checked: boolean) => void;
}) {
  return (
    <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
      {PERMISSION_GROUPS.map((group) => {
        const allChecked = group.permissions.every((p) => selected.has(p));
        return (
          <div key={group.label}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">{group.label}</p>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted hover:text-foreground">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => selectAll(group.permissions as unknown as string[], e.target.checked)}
                  className="rounded"
                />
                All
              </label>
            </div>
            <div className="space-y-0.5">
              {group.permissions.map((perm) => (
                <label
                  key={perm}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-surface cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(perm)}
                    onChange={() => toggle(perm)}
                    className="rounded border-surface-border"
                  />
                  <span className="text-sm text-foreground">{PERMISSION_LABELS[perm as Permission]}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoleCard({
  role,
  onEdit,
  onDelete,
}: {
  role: StaffRole;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const grouped = PERMISSION_GROUPS.map((g) => ({
    ...g,
    active: g.permissions.filter((p) => (role.permissions as string[]).includes(p)),
  })).filter((g) => g.active.length > 0);

  const permCount = (role.permissions as string[]).length;
  const fullAccess = permCount === ALL_PERMISSIONS.length;

  return (
    <div className="group rounded-2xl border border-surface-border bg-background hover:border-brand-200 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              fullAccess ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-brand-400 to-brand-600"
            } text-white shadow-sm`}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{role.name}</h3>
              {role.isSystem && (
                <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                  System Role
                </span>
              )}
            </div>
          </div>
          {role.description && (
            <p className="text-xs text-muted line-clamp-2 mt-1">{role.description}</p>
          )}
        </div>
        {!role.isSystem && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={onEdit}
              className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-surface transition"
              title="Edit role"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg p-1.5 text-muted hover:text-danger hover:bg-danger/10 transition"
              title="Delete role"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-5 py-2.5 bg-surface/50 border-y border-surface-border">
        <div className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs text-muted">{role._count.users} member{role._count.users !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-xs text-muted">
            {fullAccess ? "Full access" : `${permCount} permission${permCount !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {/* Permissions */}
      <div className="p-5 pt-3 space-y-3">
        {grouped.map((g) => (
          <div key={g.label}>
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1.5">{g.label}</p>
            <div className="flex flex-wrap gap-1">
              {g.active.map((p) => (
                <span key={p} className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted border border-surface-border">
                  {PERMISSION_LABELS[p as Permission] ?? p}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemberRow({
  member,
  roles,
  onAssignRole,
  onRemove,
}: {
  member: StaffMember;
  roles: StaffRole[];
  onAssignRole: (roleId: string | null) => void;
  onRemove: () => void;
}) {
  const displayName = member.name ?? member.username ?? member.email.split("@")[0];

  return (
    <tr className="group hover:bg-surface/40 transition-colors">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar name={displayName} image={member.image} size={10} />
            <OnlineIndicator lastSeenAt={member.lastSeenAt} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground leading-tight truncate">{displayName}</p>
            <p className="text-xs text-muted truncate">{member.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <select
          value={member.staffRoleId ?? ""}
          onChange={(e) => onAssignRole(e.target.value || null)}
          className="rounded-lg border border-surface-border bg-background px-2.5 py-1.5 text-base font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[140px] sm:text-xs"
        >
          <option value="">Owner (Full Access)</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3.5 hidden sm:table-cell">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${
            member.lastSeenAt && Date.now() - new Date(member.lastSeenAt).getTime() < 5 * 60 * 1000
              ? "bg-success"
              : member.lastSeenAt && Date.now() - new Date(member.lastSeenAt).getTime() < 30 * 60 * 1000
              ? "bg-warning"
              : "bg-surface-border"
          }`} />
          <span className="text-xs text-muted">{timeAgo(member.lastSeenAt)}</span>
        </div>
      </td>
      <td className="px-4 py-3.5 text-xs text-muted hidden md:table-cell">
        {new Date(member.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
      </td>
      <td className="px-4 py-3.5 text-right">
        <button
          onClick={onRemove}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 transition opacity-0 group-hover:opacity-100"
          title="Remove from admin team"
        >
          Remove
        </button>
      </td>
    </tr>
  );
}

export function StaffManagementClient() {
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"members" | "roles">("members");

  // Create / edit role modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<StaffRole | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [rolePerms, setRolePerms] = useState<Set<string>>(new Set());
  const [savingRole, setSavingRole] = useState(false);

  // Add staff modal state
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [addMode, setAddMode] = useState<"search" | "invite">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [newMemberRoleId, setNewMemberRoleId] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/admin/staff");
    if (res.ok) {
      const data = await res.json();
      setRoles(data.roles);
      setMembers(data.staffMembers);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Search debounce
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      const res = await fetch(`/api/admin/staff/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) setSearchResults((await res.json()).users);
      setSearchLoading(false);
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery]);

  function openCreateRole() {
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
    setRolePerms(new Set());
    setShowRoleModal(true);
  }

  function openEditRole(role: StaffRole) {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description ?? "");
    setRolePerms(new Set(role.permissions));
    setShowRoleModal(true);
  }

  function togglePerm(perm: string) {
    setRolePerms((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm); else next.add(perm);
      return next;
    });
  }

  function selectAllPerms(perms: string[], checked: boolean) {
    setRolePerms((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => checked ? next.add(p) : next.delete(p));
      return next;
    });
  }

  async function saveRole() {
    if (!roleName.trim() || rolePerms.size === 0) {
      toast.error("Name and at least one permission required");
      return;
    }
    setSavingRole(true);
    const url = editingRole ? `/api/admin/staff/${editingRole.id}` : "/api/admin/staff";
    const method = editingRole ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: roleName.trim(),
        description: roleDescription.trim() || null,
        permissions: Array.from(rolePerms),
      }),
    });
    if (res.ok) {
      toast.success(editingRole ? "Role updated" : "Role created");
      setShowRoleModal(false);
      fetchData();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Failed");
    }
    setSavingRole(false);
  }

  async function deleteRole(id: string) {
    if (!confirm("Delete this role? Staff members with this role will become Owner-level.")) return;
    const res = await fetch(`/api/admin/staff/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Role deleted"); fetchData(); }
    else { const d = await res.json(); toast.error(d.error ?? "Failed"); }
  }

  async function assignRole(userId: string, staffRoleId: string | null) {
    const res = await fetch("/api/admin/staff/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, staffRoleId }),
    });
    if (res.ok) { toast.success("Role updated"); fetchData(); }
    else { const d = await res.json(); toast.error(d.error ?? "Failed"); }
  }

  async function addStaffMember() {
    if (!selectedUser) return;
    setAddingMember(true);
    const res = await fetch("/api/admin/staff/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUser.id, staffRoleId: newMemberRoleId || null }),
    });
    if (res.ok) {
      toast.success(`${selectedUser.name ?? selectedUser.email} added as staff`);
      closeAddModal();
      fetchData();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Failed");
    }
    setAddingMember(false);
  }

  async function sendInvite() {
    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error("Enter a valid email address");
      return;
    }
    setAddingMember(true);
    const res = await fetch("/api/admin/staff/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), staffRoleId: newMemberRoleId || null }),
    });
    if (res.ok) {
      toast.success(`Invitation sent to ${inviteEmail}`);
      closeAddModal();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Failed to send invite");
    }
    setAddingMember(false);
  }

  function closeAddModal() {
    setShowAddStaff(false);
    setSelectedUser(null);
    setSearchQuery("");
    setSearchResults([]);
    setInviteEmail("");
    setNewMemberRoleId("");
    setAddMode("search");
  }

  async function removeStaffMember(member: StaffMember) {
    const label = member.name ?? member.email;
    if (!confirm(`Remove ${label} from the admin team? They will become a regular user.`)) return;
    const res = await fetch("/api/admin/staff/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: member.id }),
    });
    if (res.ok) { toast.success(`${label} removed from staff`); fetchData(); }
    else { const d = await res.json(); toast.error(d.error ?? "Failed"); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-surface-border border-t-brand-500" />
          <p className="text-sm text-muted">Loading staff...</p>
        </div>
      </div>
    );
  }

  const onlineCount = members.filter((m) => m.lastSeenAt && Date.now() - new Date(m.lastSeenAt).getTime() < 5 * 60 * 1000).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            Staff &amp; Roles
          </h1>
          <p className="mt-2 text-sm text-muted">
            {members.length} admin{members.length !== 1 ? "s" : ""} · {onlineCount > 0 && <span className="text-success">{onlineCount} online</span>} · {roles.length} custom role{roles.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddStaff(true)}
            className="flex items-center gap-2 rounded-xl border border-surface-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface hover:border-brand-300 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Add Staff
          </button>
          <button
            onClick={openCreateRole}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-brand-600 hover:to-brand-700 transition shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create Role
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-surface p-1 w-fit border border-surface-border">
        {(["members", "roles"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition ${
              tab === t ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {t === "members" ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Members ({members.length})
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Roles ({roles.length})
              </>
            )}
          </button>
        ))}
      </div>

      {/* Staff Members Tab */}
      {tab === "members" && (
        <div className="rounded-2xl border border-surface-border overflow-hidden bg-background">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-surface border-b border-surface-border">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Member</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Role</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted hidden sm:table-cell">Activity</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted hidden md:table-cell">Joined</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {members.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  roles={roles}
                  onAssignRole={(roleId) => assignRole(m.id, roleId)}
                  onRemove={() => removeStaffMember(m)}
                />
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-surface flex items-center justify-center">
                        <svg className="h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-sm text-muted">No staff members found.</p>
                      <button onClick={() => setShowAddStaff(true)} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
                        Add your first team member
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {tab === "roles" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              onEdit={() => openEditRole(role)}
              onDelete={() => deleteRole(role.id)}
            />
          ))}
          {roles.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-surface-border p-12 text-center bg-surface/30">
              <div className="flex flex-col items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-surface flex items-center justify-center">
                  <svg className="h-7 w-7 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">No custom roles yet</p>
                  <p className="text-xs text-muted mt-1">Create roles to limit what team members can access</p>
                </div>
                <button onClick={openCreateRole} className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-brand-600 hover:underline">
                  Create your first role
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Role Modal */}
      {showRoleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowRoleModal(false)}
        >
          <div
            className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-surface-border bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-foreground">
                  {editingRole ? "Edit Role" : "Create Role"}
                </h2>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Role Name</label>
                <input
                  type="text"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="e.g. Support Agent"
                  className="w-full rounded-xl border border-surface-border bg-surface px-3.5 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Description <span className="text-muted font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="e.g. Handles customer support tickets and disputes"
                  className="w-full rounded-xl border border-surface-border bg-surface px-3.5 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Role Preset</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {STAFF_ROLE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setRolePerms(new Set(preset.permissions))}
                      title={preset.description}
                      className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-left hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition"
                    >
                      <p className="text-xs font-semibold text-foreground">{preset.label}</p>
                      <p className="text-[10px] text-muted mt-0.5 line-clamp-1">{preset.description}</p>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] text-muted">Selecting a preset will replace current permission selection.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Permissions
                  <span className="ml-2 text-xs font-normal text-muted">({rolePerms.size} selected)</span>
                </label>
                <div className="rounded-xl border border-surface-border p-3 bg-surface/50">
                  <PermissionGrouped selected={rolePerms} toggle={togglePerm} selectAll={selectAllPerms} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="flex-1 rounded-xl border border-surface-border px-4 py-2.5 text-sm font-medium text-muted hover:text-foreground hover:bg-surface transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRole}
                  disabled={savingRole}
                  className="flex-1 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-brand-600 hover:to-brand-700 disabled:opacity-60 transition"
                >
                  {savingRole ? "Saving…" : editingRole ? "Save Changes" : "Create Role"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeAddModal}
        >
          <div
            className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-surface-border bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-foreground">Add Staff Member</h2>
              </div>
              <button
                onClick={closeAddModal}
                className="rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex gap-1 rounded-xl bg-surface p-1 mb-4 border border-surface-border">
              <button
                onClick={() => { setAddMode("search"); setInviteEmail(""); }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  addMode === "search" ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                Search Users
              </button>
              <button
                onClick={() => { setAddMode("invite"); setSelectedUser(null); setSearchQuery(""); }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  addMode === "invite" ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Invite by Email
              </button>
            </div>

            <div className="space-y-4">
              {/* Search mode */}
              {addMode === "search" && (
                <>
                  {!selectedUser ? (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Search Existing Users</label>
                      <div className="relative">
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Email, name, or username…"
                          className="w-full rounded-xl border border-surface-border bg-surface py-2.5 pl-10 pr-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:text-sm"
                          autoFocus
                        />
                        {searchLoading && (
                          <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        )}
                      </div>
                      {searchResults.length > 0 && (
                        <div className="mt-2 rounded-xl border border-surface-border overflow-hidden divide-y divide-surface-border max-h-48 overflow-y-auto">
                          {searchResults.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => { setSelectedUser(u); setSearchQuery(""); setSearchResults([]); }}
                              className="flex w-full items-center gap-3 px-3.5 py-3 hover:bg-surface transition text-left"
                            >
                              <Avatar name={u.name ?? u.email} image={u.image} size={8} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">{u.name ?? u.username ?? "—"}</p>
                                <p className="text-xs text-muted truncate">{u.email}</p>
                              </div>
                              <svg className="h-4 w-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
                        <div className="mt-2 rounded-xl border border-dashed border-surface-border py-6 text-center">
                          <p className="text-xs text-muted">No users found</p>
                          <button
                            onClick={() => { setAddMode("invite"); setInviteEmail(searchQuery); setSearchQuery(""); }}
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                          >
                            Invite {searchQuery} instead
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                      )}
                      <p className="mt-2 text-xs text-muted">Only non-admin users are shown.</p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Selected User</label>
                      <div className="flex items-center gap-3 rounded-xl border-2 border-brand-200 bg-brand-50/50 px-4 py-3">
                        <Avatar name={selectedUser.name ?? selectedUser.email} image={selectedUser.image} size={10} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{selectedUser.name ?? selectedUser.username ?? "—"}</p>
                          <p className="text-xs text-muted truncate">{selectedUser.email}</p>
                        </div>
                        <button
                          onClick={() => setSelectedUser(null)}
                          className="rounded-lg p-1.5 text-muted hover:text-danger hover:bg-danger/10 transition shrink-0"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Invite mode */}
              {addMode === "invite" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
                  <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="w-full rounded-xl border border-surface-border bg-surface py-2.5 pl-10 pr-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:text-sm"
                      autoFocus
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    They&apos;ll receive an email invitation to join as a staff member.
                  </p>
                </div>
              )}

              {/* Role assignment */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Assign Role</label>
                <select
                  value={newMemberRoleId}
                  onChange={(e) => setNewMemberRoleId(e.target.value)}
                  className="w-full rounded-xl border border-surface-border bg-surface px-3.5 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:text-sm"
                >
                  <option value="">Owner (Full Access)</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-muted">You can change this later from the members table.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={closeAddModal}
                  className="flex-1 rounded-xl border border-surface-border px-4 py-2.5 text-sm font-medium text-muted hover:text-foreground hover:bg-surface transition"
                >
                  Cancel
                </button>
                <button
                  onClick={addMode === "search" ? addStaffMember : sendInvite}
                  disabled={(addMode === "search" && !selectedUser) || (addMode === "invite" && !inviteEmail.trim()) || addingMember}
                  className="flex-1 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-brand-600 hover:to-brand-700 disabled:opacity-60 transition"
                >
                  {addingMember ? (addMode === "invite" ? "Sending…" : "Adding…") : addMode === "invite" ? "Send Invite" : "Add to Staff"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
