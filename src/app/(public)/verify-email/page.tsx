"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Status = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Verification failed");
        setStatus("success");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      });
  }, [token]);

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      {status === "verifying" && <p className="text-muted">Verifying your email…</p>}
      {status === "success" && (
        <>
          <span className="text-5xl">🎉</span>
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
