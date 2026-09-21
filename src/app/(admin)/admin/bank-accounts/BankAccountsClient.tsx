"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { PlatformBankAccount } from "@prisma/client";

interface FormState {
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode: string;
  iban: string;
  currency: string;
  sortOrder: string;
}

const EMPTY_FORM: FormState = {
  bankName: "",
  accountName: "",
  accountNumber: "",
  routingNumber: "",
  swiftCode: "",
  iban: "",
  currency: "USD",
  sortOrder: "0",
};

function toFormState(account: PlatformBankAccount): FormState {
  return {
    bankName: account.bankName,
    accountName: account.accountName,
    accountNumber: account.accountNumber,
    routingNumber: account.routingNumber ?? "",
    swiftCode: account.swiftCode ?? "",
    iban: account.iban ?? "",
    currency: account.currency,
    sortOrder: String(account.sortOrder),
  };
}

export function BankAccountsClient({ initialAccounts }: { initialAccounts: PlatformBankAccount[] }) {
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

  function startEdit(account: PlatformBankAccount) {
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
      bankName: form.bankName,
      accountName: form.accountName,
      accountNumber: form.accountNumber,
      routingNumber: form.routingNumber || undefined,
      swiftCode: form.swiftCode || undefined,
      iban: form.iban || undefined,
      currency: form.currency || "USD",
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      const url = editingId ? `/api/admin/bank-accounts/${editingId}` : "/api/admin/bank-accounts";
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

  async function toggleActive(account: PlatformBankAccount) {
    setTogglingId(account.id);
    try {
      const res = await fetch(`/api/admin/bank-accounts/${account.id}`, {
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
        <Button onClick={startAdd} variant="primary">+ Add Bank Account</Button>
      </div>

      {showForm && (
        <Card>
          <p className="mb-4 text-sm font-semibold">{editingId ? "Edit Account" : "New Bank Account"}</p>
          <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Bank Name" required {...field("bankName")} />
            <Input label="Account Holder Name" required {...field("accountName")} />
            <Input label="Account Number" required {...field("accountNumber")} />
            <Input label="Routing Number (optional)" {...field("routingNumber")} />
            <Input label="SWIFT / BIC (optional)" {...field("swiftCode")} />
            <Input label="IBAN (optional)" {...field("iban")} />
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
                {account.bankName}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${account.isActive ? "bg-success/10 text-success" : "bg-muted/10 text-muted"}`}>
                  {account.isActive ? "Active" : "Inactive"}
                </span>
              </p>
              <p className="text-sm text-muted">{account.accountName} · {account.accountNumber}</p>
              <p className="text-xs text-muted break-all">
                {[account.swiftCode && `SWIFT: ${account.swiftCode}`, account.iban && `IBAN: ${account.iban}`, account.routingNumber && `Routing: ${account.routingNumber}`]
                  .filter(Boolean).join(" · ") || "No additional identifiers"}
              </p>
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
          <p className="py-10 text-center text-muted">No bank accounts configured. Add one above.</p>
        )}
      </div>
    </div>
  );
}
