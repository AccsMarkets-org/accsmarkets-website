"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { LogoMark } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

const LAST_EMAIL_KEY = "accsmarkets-admin-last-email";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [showTotp, setShowTotp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [faceIdLoading, setFaceIdLoading] = useState(false);
  const [webauthnSupported, setWebauthnSupported] = useState(false);

  useEffect(() => {
    setWebauthnSupported(browserSupportsWebAuthn());
    const remembered = localStorage.getItem(LAST_EMAIL_KEY);
    if (remembered) setEmail(remembered);
  }, []);

  async function handleFaceId() {
    if (!email) {
      setError("Enter your email first, then tap Face ID.");
      return;
    }
    setFaceIdLoading(true);
    setError("");
    try {
      const optionsRes = await fetch("/api/admin/webauthn/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const options = await optionsRes.json();
      if (!optionsRes.ok) {
        setError(options.error ?? "Face ID isn't set up for this account yet.");
        return;
      }

      const assertion = await startAuthentication(options);

      const res = await signIn("webauthn", {
        redirect: false,
        email,
        credential: JSON.stringify(assertion),
        callbackUrl: "/admin",
      });

      if (res?.error) {
        setError(parseLoginError(res.error));
        return;
      }

      localStorage.setItem(LAST_EMAIL_KEY, email);
      router.push("/admin");
    } catch (err) {
      // The user cancelling the OS Face ID prompt is not a real error.
      const msg = err instanceof Error ? err.message : "";
      if (!/NotAllowedError|cancel/i.test(msg)) {
        setError("Face ID sign-in failed. Use your password instead.");
      }
    } finally {
      setFaceIdLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      totpCode: totp || undefined,
      callbackUrl: "/admin",
    });

    if (res?.error) {
      if (res.error === "TOTP_REQUIRED") {
        setShowTotp(true);
        setLoading(false);
        return;
      }
      setError(parseLoginError(res.error));
      setLoading(false);
      return;
    }

    localStorage.setItem(LAST_EMAIL_KEY, email);
    router.push("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <LogoMark size="lg" />
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">Admin Portal</h1>
            <p className="mt-1 text-sm text-gray-400">AccsMarkets administration panel</p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-base text-white placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                placeholder="admin@accsmarkets.org"
              />
            </div>

            {webauthnSupported && (
              <button
                type="button"
                onClick={handleFaceId}
                disabled={faceIdLoading}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800 py-2.5 text-sm font-medium text-white transition hover:border-brand-500 hover:bg-gray-750 disabled:opacity-60"
              >
                {faceIdLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" d="M4 7V5a1 1 0 011-1h2M4 17v2a1 1 0 001 1h2M20 7V5a1 1 0 00-1-1h-2M20 17v2a1 1 0 01-1 1h-2" />
                    <path strokeLinecap="round" d="M9 10v1M15 10v1M9.5 15c.6.7 1.4 1 2.5 1s1.9-.3 2.5-1" />
                  </svg>
                )}
                {faceIdLoading ? "Waiting for Face ID…" : "Sign in with Face ID"}
              </button>
            )}

            {webauthnSupported && (
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <div className="h-px flex-1 bg-gray-800" />
                or use your password
                <div className="h-px flex-1 bg-gray-800" />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-base text-white placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>

            {showTotp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
              >
                <label className="mb-1.5 block text-sm font-medium text-gray-300">2FA Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totp}
                  onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-base text-white placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm tracking-widest text-center"
                  placeholder="000000"
                  autoFocus
                />
              </motion.div>
            )}

            {error && (
              <p className="rounded-lg bg-red-950/50 border border-red-900/50 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <Button type="submit" isLoading={loading} className="w-full mt-1">
              {showTotp ? "Verify & Sign In" : "Sign In"}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-600">
          This portal is restricted to authorized staff only.
        </p>
      </motion.div>
    </div>
  );
}

function parseLoginError(raw: string): string {
  if (raw === "MISSING_CREDENTIALS") return "Enter your email and password.";
  if (raw === "ACCOUNT_BANNED") return "This account has been suspended.";
  if (raw === "INVALID_TOTP") return "Incorrect 2FA code. Try again.";
  if (raw === "ACCOUNT_LOCKED") return "Too many attempts — try again in 15 minutes.";
  if (raw.startsWith("INVALID_CREDENTIALS:")) {
    const n = raw.split(":")[1];
    return `Incorrect credentials. ${n} attempt${n === "1" ? "" : "s"} remaining.`;
  }
  if (raw === "INVALID_CREDENTIALS") return "Incorrect email or password.";
  return "Login failed. Please try again.";
}
