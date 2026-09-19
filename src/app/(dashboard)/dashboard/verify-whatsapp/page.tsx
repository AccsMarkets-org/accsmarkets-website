"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const RESEND_COOLDOWN = 60;

function VerifyWhatsAppInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [step, setStep] = useState<"phone" | "code" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => {
        const u = d.user ?? d;
        if (u.phoneVerified) setStep("done");
      })
      .catch(() => {})
      .finally(() => setFetching(false));
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  function startCooldown() {
    setResendCooldown(RESEND_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  async function sendCode(isResend = false) {
    setLoading(true);
    try {
      const res = await fetch("/api/verification/phone/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send code");
      toast.success(isResend ? "New code sent on WhatsApp!" : "Code sent on WhatsApp!");
      setStep("code");
      startCooldown();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function confirmCode() {
    setLoading(true);
    try {
      const res = await fetch("/api/verification/phone/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Incorrect code");
      toast.success("WhatsApp number verified!");
      setStep("done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) return null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Verify your WhatsApp number</h1>
      <p className="-mt-3 text-sm text-muted">
        Required to list an account, buy, or message other users — we use it to send you a one-time code and
        keep the marketplace free of fake accounts.
      </p>

      {step === "phone" && (
        <Card>
          <h2 className="mb-3 font-semibold">Enter your WhatsApp number</h2>
          <div className="flex flex-col gap-3">
            <Input
              label="WhatsApp number (with country code)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+15551234567"
            />
            <Button size="sm" isLoading={loading} disabled={!phone} onClick={() => sendCode(false)} className="self-start">
              Send code on WhatsApp
            </Button>
          </div>
        </Card>
      )}

      {step === "code" && (
        <Card>
          <h2 className="mb-3 font-semibold">Enter the code</h2>
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-brand-200 bg-brand-500/10 px-4 py-3 text-sm">
              <p className="font-medium text-brand-700">Check WhatsApp</p>
              <p className="mt-0.5 text-brand-600">
                A 6-digit code was sent to <span className="font-semibold">{phone}</span>. It expires in 10 minutes.
              </p>
            </div>
            <Input
              label="Verification code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setStep("phone")}>Back</Button>
              <Button size="sm" isLoading={loading} disabled={code.length < 6} onClick={confirmCode}>Confirm</Button>
              <button
                type="button"
                onClick={() => sendCode(true)}
                disabled={resendCooldown > 0 || loading}
                className="ml-auto text-xs text-brand-500 hover:underline disabled:cursor-not-allowed disabled:text-muted"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </button>
            </div>
          </div>
        </Card>
      )}

      {step === "done" && (
        <Card className="bg-success/5">
          <p className="flex items-center gap-2 font-semibold text-success">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            WhatsApp number verified
          </p>
          <p className="mt-1 text-sm text-muted">You can now list, buy, and message other users.</p>
          <Button size="sm" className="mt-4" onClick={() => router.push(next)}>
            Continue →
          </Button>
        </Card>
      )}
    </div>
  );
}

export default function VerifyWhatsAppPage() {
  return (
    <Suspense fallback={null}>
      <VerifyWhatsAppInner />
    </Suspense>
  );
}
