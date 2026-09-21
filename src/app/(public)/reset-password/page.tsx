"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One number", test: (p) => /\d/.test(p) },
];

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const rulesOk = RULES.every((r) => r.test(password));
  const matches = password.length > 0 && password === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!rulesOk) { setError("Password doesn't meet the requirements below."); return; }
    if (!matches) { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reset failed");
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-danger">Invalid link</h1>
        <p className="text-sm text-muted">This reset link is missing its token. Request a fresh one below.</p>
        <Link href="/forgot-password" className="text-brand-600 hover:underline">
          Request a new reset link
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted">Choose a password you don&apos;t use anywhere else.</p>
      </div>
      <Card>
        {done ? (
          <p className="text-center text-sm text-success">Password updated — redirecting to login…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="New password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="Confirm new password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
              Show passwords
            </label>
            <ul className="flex flex-col gap-1 text-xs">
              {RULES.map((r) => {
                const ok = r.test(password);
                return (
                  <li key={r.label} className={ok ? "text-success" : "text-muted"}>
                    {ok ? "✓" : "○"} {r.label}
                  </li>
                );
              })}
              <li className={matches ? "text-success" : "text-muted"}>{matches ? "✓" : "○"} Passwords match</li>
            </ul>
            {error && (
              <p className="text-sm text-danger">
                {error}{" "}
                {/expired|invalid/i.test(error) && (
                  <Link href="/forgot-password" className="underline">Request a new link</Link>
                )}
              </p>
            )}
            <Button type="submit" isLoading={loading} disabled={!rulesOk || !matches} className="w-full">
              Update password
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
