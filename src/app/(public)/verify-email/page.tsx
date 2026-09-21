"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Status = "verifying" | "success" | "error";

function ResendForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNote(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not send a new link.");
      setNote({ ok: true, text: "If that address has an unverified account, a new link is on its way. Check spam too." });
    } catch (err) {
      setNote({ ok: false, text: err instanceof Error ? err.message : "Could not send a new link." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 rounded-2xl border border-surface-border bg-surface p-4 text-left">
      <p className="text-sm font-medium">Send me a new verification link</p>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {note && <p className={`text-sm ${note.ok ? "text-success" : "text-danger"}`}>{note.text}</p>}
      <Button type="submit" isLoading={loading} className="w-full">
        Send new link
      </Button>
    </form>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("");
  // The token is single-use: a second POST (effect re-run) would report a false failure.
  const submitted = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This link is missing its verification token.");
      return;
    }
    if (submitted.current) return;
    submitted.current = true;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Verification failed");
        setStatus("success");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      });
  }, [token]);

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center sm:px-6">
      {status === "verifying" && <p className="text-muted">Verifying your email…</p>}
      {status === "success" && (
        <>
          <h1 className="text-2xl font-bold text-success">Email verified</h1>
          <p className="text-muted">Your account is now active. You can log in.</p>
          <Link
            href="/login"
            className="rounded-xl bg-brand-500 px-6 py-3 font-medium text-white shadow-card transition hover:bg-brand-600"
          >
            Log in
          </Link>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="text-2xl font-bold text-danger">Verification failed</h1>
          <p className="text-muted">{message}</p>
          <p className="text-sm text-muted">
            Links expire after 24 hours and work only once. If you already verified, just log in.
          </p>
          <ResendForm />
          <Link href="/login" className="text-brand-600 hover:underline">
            Back to login
          </Link>
        </>
      )}
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
