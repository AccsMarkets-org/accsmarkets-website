"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { PlatformPayPalAccount } from "@prisma/client";

interface FormState {
  label: string;
  paypalEmail: string;
  instructions: string;
  currency: string;
  sortOrder: string;
}

const EMPTY_FORM: FormState = {
  label: "",
  paypalEmail: "",
  instructions: "",
  currency: "USD",
  sortOrder: "0",
};

function toFormState(account: PlatformPayPalAccount): FormState {
  return {
    label: account.label,
    paypalEmail: account.paypalEmail,
    instructions: account.instructions ?? "",
    currency: account.currency,
    sortOrder: String(account.sortOrder),
  };
}

export function PayPalAccountsClient({ initialAccounts }: { initialAccounts: PlatformPayPalAccount[] }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function field(key: keyof FormState) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
    };
  }

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(account: PlatformPayPalAccount) {
    setEditingId(account.id);
    setForm(toFormState(account));
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      label: form.label,
      paypalEmail: form.paypalEmail,
      instructions: form.instructions || undefined,
      currency: form.currency || "USD",
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      const url = editingId ? `/api/admin/paypal-accounts/${editingId}` : "/api/admin/paypal-accounts";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(editingId ? "Account updated" : "Account created");
      cancel();
      router.refresh();
      if (editingId) {
        setAccounts((prev) => prev.map((a) => (a.id === editingId ? data.account : a)));
      } else {
        setAccounts((prev) => [...prev, data.account]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(account: PlatformPayPalAccount) {
    setTogglingId(account.id);
    try {
      const res = await fetch(`/api/admin/paypal-accounts/${account.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !account.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setAccounts((prev) => prev.map((a) => (a.id === account.id ? data.account : a)));
      toast.success(data.account.isActive ? "Account activated" : "Account deactivated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={startAdd} variant="primary">+ Add PayPal Account</Button>
      </div>

      {showForm && (
        <Card>
          <p className="mb-4 text-sm font-semibold">{editingId ? "Edit Account" : "New PayPal Account"}</p>
          <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Label (e.g. Personal Account)" required {...field("label")} />
            <Input label="PayPal Email" type="email" required {...field("paypalEmail")} />
            <Input label="Instructions for buyer (optional)" {...field("instructions")} />
            <Input label="Currency (e.g. USD)" required {...field("currency")} />
            <Input label="Sort Order" type="number" {...field("sortOrder")} />
            <div className="sm:col-span-2 flex gap-2">
              <Button type="button" variant="outline" onClick={cancel} className="flex-1">Cancel</Button>
              <Button type="submit" isLoading={saving} className="flex-1">Save</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {accounts.map((account) => (
          <Card key={account.id} className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium">
                {account.label}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${account.isActive ? "bg-success/10 text-success" : "bg-muted/10 text-muted"}`}>
                  {account.isActive ? "Active" : "Inactive"}
                </span>
              </p>
              <p className="text-sm text-muted">{account.paypalEmail}</p>
              {account.instructions && (
                <p className="text-xs text-muted break-all">{account.instructions}</p>
              )}
              <p className="text-xs text-muted">{account.currency} · Sort: {account.sortOrder}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => startEdit(account)}>Edit</Button>
              <Button
                size="sm"
                variant={account.isActive ? "danger" : "outline"}
                isLoading={togglingId === account.id}
                onClick={() => toggleActive(account)}
              >
                {account.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </Card>
        ))}
        {accounts.length === 0 && (
          <p className="py-10 text-center text-muted">No PayPal accounts configured. Add one above.</p>
        )}
      </div>
    </div>
  );
}
