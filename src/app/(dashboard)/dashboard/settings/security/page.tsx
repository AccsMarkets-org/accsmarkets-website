"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

type Step = "idle" | "qr" | "confirm" | "backup";

export default function SecuritySettingsPage() {
  const router = useRouter();

  // -- Password change --
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // -- 2FA enabled state --
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [tfaStatusLoading, setTfaStatusLoading] = useState(true);
  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => { if (d.user?.twoFactorEnabled) setTwoFactorEnabled(true); })
      .catch(() => {})
      .finally(() => setTfaStatusLoading(false));
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirm) { toast.error("Passwords don't match"); return; }
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setPwLoading(true);
    try {
      const res = await fetch("/api/user/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Password updated");
      setCurrent(""); setNewPw(""); setConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setPwLoading(false);
    }
  }

  // -- 2FA wizard --
  const [step, setStep] = useState<Step>("idle");
  const [tfaData, setTfaData] = useState<{ secret: string; otpAuthUri: string; backupCodes: string[] } | null>(null);
  const [code, setCode] = useState("");
  const [tfaLoading, setTfaLoading] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);

  // Disable 2FA
  const [showDisable, setShowDisable] = useState(false);
  const [disablePw, setDisablePw] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);

  async function startSetup() {
    setTfaLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setTfaData(data);
      setStep("qr");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setTfaLoading(false);
    }
  }

  async function verifySetup() {
    setTfaLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setStep("backup");
      setCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setTfaLoading(false);
    }
  }

  async function disable2FA() {
    setDisableLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePw, code: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("2FA disabled");
      setShowDisable(false); setDisablePw(""); setDisableCode("");
      setTwoFactorEnabled(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setDisableLoading(false);
    }
  }

  function copyBackupCodes() {
    if (!tfaData) return;
    navigator.clipboard.writeText(tfaData.backupCodes.join("\n"));
    toast.success("Backup codes copied");
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Security settings</h1>

      {/* Password */}
      <Card>
        <h2 className="mb-3 font-semibold">Change password</h2>
        <form onSubmit={changePassword} className="flex flex-col gap-3">
          <Input label="Current password" type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          <Input label="New password" type="password" required minLength={8} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <Input label="Confirm new password" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <Button type="submit" isLoading={pwLoading} className="self-start">Save password</Button>
        </form>
      </Card>

      {/* 2FA */}
      <Card>
        <h2 className="mb-3 font-semibold">Two-factor authentication</h2>

        {step === "idle" && !showDisable && (
          tfaStatusLoading ? (
            <div className="h-8 w-32 animate-pulse rounded-full bg-surface" />
          ) : (
            <div className="flex items-center justify-between gap-4">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${twoFactorEnabled ? "bg-success/10 text-success" : "bg-muted/10 text-muted"}`}>
                {twoFactorEnabled ? "Enabled" : "Disabled"}
              </span>
              {twoFactorEnabled ? (
                <Button size="sm" variant="danger" onClick={() => setShowDisable(true)}>Disable 2FA</Button>
              ) : (
                <Button size="sm" isLoading={tfaLoading} onClick={startSetup}>Enable 2FA</Button>
              )}
            </div>
          )
        )}

        {/* Step 1: QR code */}
        {step === "qr" && tfaData && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.).</p>
            <QRCodeSVG
              value={tfaData.otpAuthUri}
              size={180}
              className="rounded-xl border border-surface-border"
            />
            <p className="text-xs text-muted">Or enter the key manually:</p>
            <code className="rounded-lg bg-surface px-3 py-2 font-mono text-xs tracking-widest">{tfaData.secret}</code>
            <Button size="sm" onClick={() => setStep("confirm")}>
              Next
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        )}

        {/* Step 2: Confirm code */}
        {step === "confirm" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">Enter the 6-digit code from your authenticator app to confirm setup.</p>
            <Input
              label="Authentication code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setStep("qr")}>Back</Button>
              <Button size="sm" disabled={code.length !== 6} isLoading={tfaLoading} onClick={verifySetup}>Verify</Button>
            </div>
          </div>
        )}

        {/* Step 3: Backup codes */}
        {step === "backup" && tfaData && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-success">2FA enabled successfully.</p>
            <p className="text-sm text-muted">Save these backup codes. Each can be used once if you lose access to your authenticator app.</p>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-3 font-mono text-sm">
              {tfaData.backupCodes.map((c) => <span key={c}>{c}</span>)}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copyBackupCodes}>Copy all</Button>
              <Button
                size="sm"
                disabled={!backupConfirmed}
                onClick={() => { setStep("idle"); setTfaData(null); setTwoFactorEnabled(true); router.refresh(); }}
              >
                Finish
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={backupConfirmed} onChange={(e) => setBackupConfirmed(e.target.checked)} />
              I&apos;ve saved these backup codes
            </label>
          </div>
        )}

        {/* Disable flow */}
        {step === "idle" && showDisable && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">Enter your password and current authenticator code to disable 2FA.</p>
            <Input label="Password" type="password" value={disablePw} onChange={(e) => setDisablePw(e.target.value)} />
            <Input label="Authentication code" type="text" inputMode="numeric" maxLength={6} value={disableCode} onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))} />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowDisable(false)}>Cancel</Button>
              <Button size="sm" variant="danger" isLoading={disableLoading} disabled={!disablePw || disableCode.length < 6} onClick={disable2FA}>
                Disable 2FA
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
