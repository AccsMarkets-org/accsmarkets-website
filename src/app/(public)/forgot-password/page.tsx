"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const RESEND_SECONDS = 60;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function requestLink() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // These failure responses (rate-limited, malformed email, server error)
        // are never conditioned on whether the account exists, so surfacing
        // them doesn't leak anything — only the success path is intentionally
        // identical regardless of account existence (handled server-side).
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }
      setSent(true);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void requestLink();
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="mt-1 text-sm text-muted">We&apos;ll email you a reset link.</p>
      </div>
      <Card>
        {sent ? (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm text-muted">
              If an account exists for <strong className="break-all text-foreground">{email}</strong>, a reset link is on its way.
              It expires in 60 minutes.
            </p>
            <p className="text-xs text-muted">
              Nothing after a couple of minutes? Check your spam or promotions folder, and make sure the address is the one you signed up with.
            </p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button
              type="button"
              variant="outline"
              isLoading={loading}
              disabled={cooldown > 0}
              onClick={() => void requestLink()}
              className="w-full"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend link"}
            </Button>
            <button
              type="button"
              onClick={() => { setSent(false); setError(null); }}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" isLoading={loading} className="w-full">
              Send reset link
            </Button>
          </form>
        )}
      </Card>
      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Back to login
        </Link>
      </p>
    </main>
  );
}
