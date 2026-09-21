"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ArrowRight, CalendarDays, Check, ClipboardList, Eye, Lock, Scale, ShieldCheck, TriangleAlert, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STEPS = ["Email", "Verify Identity", "ID Verified"] as const;
const RESEND_COOLDOWN = 60;
const CONSENT_KEY = "kyc_consent_v1";

type KycLevel = "NONE" | "EMAIL" | "PHONE" | "ID_VERIFIED";
type SubStep = "email-entry" | "email-code" | "id-upload" | "id-pending";

function stepIndex(level: KycLevel): number {
  if (level === "NONE" || level === "EMAIL") return 0;
  if (level === "PHONE") return 1;
  return 2;
}

// ── KYC Consent Modal ──────────────────────────────────────────────────────────

function KycConsentModal({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-bg border border-surface-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-surface-border px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/10">
            <ShieldCheck className="h-5 w-5 text-brand-500" aria-hidden />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Identity Verification Consent</h2>
            <p className="text-xs text-muted">Please read before continuing</p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto max-h-[55vh] px-6 py-5 flex flex-col gap-4 text-sm text-muted">
          <p className="text-foreground font-medium">
            To unlock full marketplace access, AccsMarkets requires identity verification (KYC). Before you proceed, please read and agree to the following:
          </p>

          <Section icon={ClipboardList} title="What we collect">
            <ul className="list-disc pl-4 space-y-1">
              <li>A photo of the <strong>front of your government-issued ID</strong> (passport, national ID, or driver's licence)</li>
              <li>A photo of the <strong>back of your ID</strong> (where applicable)</li>
              <li>A <strong>selfie</strong> holding your ID next to your face</li>
            </ul>
          </Section>

          <Section icon={Lock} title="How it is stored">
            <p>
              All document images are encrypted at rest using <strong>AES-256-GCM</strong> before being saved to our database. Raw Cloudinary URLs are never stored in plaintext. Only authorised AccsMarkets staff can decrypt and review your submission.
            </p>
          </Section>

          <Section icon={Eye} title="Who reviews it">
            <p>
              Your submission is reviewed by AccsMarkets compliance staff within <strong>24 hours</strong>. We do not share your documents with third parties except where required by law.
            </p>
          </Section>

          <Section icon={CalendarDays} title="Retention">
            <p>
              We retain KYC documents for a minimum of <strong>5 years</strong> as required by our AML/CFT obligations. You may request deletion after your account is closed, subject to legal retention requirements.
            </p>
          </Section>

          <Section icon={Scale} title="Legal basis">
            <p>
              Processing is carried out under our legitimate interest in preventing fraud and complying with applicable Anti-Money Laundering laws. By proceeding you acknowledge our{" "}
              <a href="/kyc-policy" target="_blank" rel="noopener noreferrer" className="text-brand-500 underline hover:text-brand-400">
                KYC Policy
              </a>,{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-500 underline hover:text-brand-400">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="/aml" target="_blank" rel="noopener noreferrer" className="text-brand-500 underline hover:text-brand-400">
                AML Policy
              </a>.
            </p>
          </Section>
        </div>

        {/* Footer */}
        <div className="border-t border-surface-border px-6 py-4 flex flex-col gap-3">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-surface-border accent-brand-500 cursor-pointer"
            />
            <span className="text-sm text-foreground">
              I have read and agree to the KYC data collection terms above. I consent to AccsMarkets processing my identity documents as described.
            </span>
          </label>

          <div className="flex gap-2 justify-end">
            <a
              href="/dashboard/settings"
              className="inline-flex items-center justify-center rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition"
            >
              Cancel
            </a>
            <button
              type="button"
              disabled={!checked}
              onClick={onAccept}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              I agree — Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface/60 p-3.5 flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden />
        {title}
      </p>
      <div className="text-muted">{children}</div>
    </div>
  );
}

// ── File upload widget ─────────────────────────────────────────────────────────

interface UploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
}

function UploadField({ label, value, onChange }: UploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG or PNG images accepted");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10 MB)");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/kyc", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
      toast.success("Uploaded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="sr-only"
        onChange={onInputChange}
      />
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success/5 px-4 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="preview" className="h-14 w-14 rounded-lg object-cover border border-surface-border shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-success flex items-center gap-1.5">
              <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              Uploaded
            </p>
            <p className="text-xs text-muted truncate">{value.split("/").pop()}</p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="shrink-0 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:border-brand-400 transition"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          disabled={uploading}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
            uploading
              ? "border-brand-300 bg-brand-50/50"
              : "border-surface-border hover:border-brand-400 hover:bg-surface/60 cursor-pointer"
          }`}
        >
          {uploading ? (
            <>
              <svg className="h-6 w-6 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm text-brand-600 font-medium">Uploading…</span>
            </>
          ) : (
            <>
              <Upload className="h-7 w-7 text-muted" strokeWidth={1.5} aria-hidden />
              <div>
                <p className="text-sm font-medium text-foreground">Click to upload or drag & drop</p>
                <p className="text-xs text-muted">JPG, PNG · Max 10 MB</p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function VerificationPage() {
  const router = useRouter();
  const [kycLevel, setKycLevel] = useState<KycLevel>("EMAIL");
  const [subStep, setSubStep] = useState<SubStep>("email-entry");
  const [userEmail, setUserEmail] = useState<string>("");
  const [code, setCode] = useState("");
  const [idFrontUrl, setIdFrontUrl] = useState("");
  const [idBackUrl, setIdBackUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showConsent, setShowConsent] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => {
        const u = d.user ?? d;
        const level: KycLevel = u.kycLevel ?? "EMAIL";
        setKycLevel(level);
        setUserEmail(u.email ?? "");
        if (level === "PHONE") setSubStep("id-upload");
        else if (level === "ID_VERIFIED") setSubStep("id-pending");
        else setSubStep("email-entry");

        // Show consent modal for users who haven't finished KYC yet
        if (level !== "ID_VERIFIED") {
          const consented = (() => { try { return localStorage.getItem(CONSENT_KEY) === "1"; } catch { return false; } })();
          if (!consented) setShowConsent(true);
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));

    fetch("/api/kyc/status")
      .then((r) => r.json())
      .then((d) => { if (d.status) setKycStatus(d.status); })
      .catch(() => {});

    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  function handleConsent() {
    try { localStorage.setItem(CONSENT_KEY, "1"); } catch {}
    setShowConsent(false);
  }

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

  async function sendCode() {
    setLoading(true);
    try {
      const res = await fetch("/api/verification/email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success("Verification code sent to your email!");
      setSubStep("email-code");
      startCooldown();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  }

  async function resendCode() {
    setLoading(true);
    try {
      const res = await fetch("/api/verification/email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success("New code sent to your email!");
      startCooldown();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  }

  async function confirmCode() {
    setLoading(true);
    try {
      const res = await fetch("/api/verification/email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success("Email verified!");
      setKycLevel("PHONE");
      setSubStep("id-upload");
      router.refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  }

  async function submitKyc() {
    if (!idFrontUrl || !idBackUrl || !selfieUrl) { toast.error("All three images are required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/kyc/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idFrontUrl, idBackUrl, selfieUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setKycStatus(data.status);
      setSubStep("id-pending");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  }

  const currentStep = stepIndex(kycLevel);

  if (fetching) return null;

  return (
    <>
      {showConsent && <KycConsentModal onAccept={handleConsent} />}

      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <h1 className="text-2xl font-bold">Identity verification</h1>

        {/* Stepper */}
        <div className="flex items-center gap-0">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  i < currentStep ? "bg-brand-500 text-white" :
                  i === currentStep ? "border-2 border-brand-500 text-brand-600" :
                  "border-2 border-surface-border text-muted"
                }`}>
                  {i < currentStep ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : i + 1}
                </div>
                <span className="text-xs text-muted">{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-2 h-0.5 flex-1 ${i < currentStep ? "bg-brand-500" : "bg-surface-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Email verification */}
        {kycLevel !== "PHONE" && kycLevel !== "ID_VERIFIED" && (
          <Card>
            <h2 className="mb-3 font-semibold">Verify your email address</h2>
            {subStep === "email-entry" && (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm">
                  <p className="font-medium text-foreground">We will send a code to:</p>
                  <p className="mt-0.5 font-semibold text-brand-600">{userEmail || "your registered email"}</p>
                </div>
                <Button size="sm" isLoading={loading} onClick={sendCode} className="self-start">
                  Send verification code
                </Button>
              </div>
            )}
            {subStep === "email-code" && (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-brand-200 bg-brand-500/10 px-4 py-3 text-sm">
                  <p className="font-medium text-brand-700">Check your inbox</p>
                  <p className="mt-0.5 text-brand-600">
                    A 6-digit code was sent to{" "}
                    <span className="font-semibold">{userEmail || "your email address"}</span>.
                    It expires in 10 minutes.
                  </p>
                </div>
                <Input label="Verification code" type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" />
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSubStep("email-entry")}>Back</Button>
                  <Button size="sm" isLoading={loading} disabled={code.length < 6} onClick={confirmCode}>Confirm</Button>
                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={resendCooldown > 0 || loading}
                    className="ml-auto text-xs text-brand-500 hover:underline disabled:cursor-not-allowed disabled:text-muted"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ID upload */}
        {kycLevel === "PHONE" && (
          <Card>
            <h2 className="mb-1 font-semibold">ID verification</h2>

            {(kycStatus === "PENDING" || kycStatus === "UNDER_REVIEW" || subStep === "id-pending") && (
              <div className="rounded-xl bg-brand-500/10 p-4 text-sm">
                <p className="font-medium text-brand-700">Submission under review</p>
                <p className="mt-1 text-muted">Our team typically reviews submissions within 24 hours.</p>
              </div>
            )}

            {kycStatus === "REJECTED" && (
              <div className="mb-3 rounded-xl bg-danger/5 p-3 text-sm text-danger">
                Your submission was rejected. Please upload updated images and resubmit.
              </div>
            )}

            {(!kycStatus || kycStatus === "REJECTED") && subStep !== "id-pending" && (
              <div className="flex flex-col gap-5 mt-3">
                <p className="text-sm text-muted -mt-1">
                  Upload clear photos of your government-issued ID and a selfie. Accepted: JPG, PNG · Max 10 MB each.
                </p>

                <UploadField label="ID front (front of your ID card / passport)" value={idFrontUrl} onChange={setIdFrontUrl} />
                <UploadField label="ID back (back of your ID card)" value={idBackUrl} onChange={setIdBackUrl} />
                <UploadField label="Selfie (hold your ID next to your face)" value={selfieUrl} onChange={setSelfieUrl} />

                <div className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                  <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
                  Make sure all images are clear and legible. Blurry or cropped images may be rejected.
                </div>

                <Button
                  size="sm"
                  isLoading={loading}
                  disabled={!idFrontUrl || !idBackUrl || !selfieUrl}
                  onClick={submitKyc}
                  className="self-start"
                >
                  Submit for review
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            )}
          </Card>
        )}

        {kycLevel === "ID_VERIFIED" && (
          <Card className="bg-success/5">
            <p className="font-semibold text-success flex items-center gap-2">
              <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
              Fully verified
            </p>
            <p className="mt-1 text-sm text-muted">Your identity has been verified.</p>
          </Card>
        )}
      </div>
    </>
  );
}
