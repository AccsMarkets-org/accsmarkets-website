"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="mt-1 text-sm text-muted">We&apos;ll email you a reset link.</p>
      </div>
      <Card>
        {sent ? (
          <p className="text-center text-sm text-muted">
            If an account exists for <strong>{email}</strong>, a reset link is on its way.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
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
