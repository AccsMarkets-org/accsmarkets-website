"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PLATFORM_LABEL, PLATFORM_COLOR } from "@/lib/constants";
import { PLATFORMS, containsContactInfo } from "@/lib/validation/listing";
import { cn } from "@/lib/utils";
import { OwnershipVerifier, platformRequiresToken } from "@/components/listings/OwnershipVerifier";

// Derived from lib/moderation.ts rule groups — update both if moderation rules change.
const DESCRIPTION_RULES = [
  "No contact info (email, phone, Telegram, WhatsApp)",
  "No external links",
  "No payment outside the platform",
  "No bypass-escrow language",
  "No profanity",
  "No spam phrases or excessive punctuation",
];

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  YOUTUBE: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.5a3 3 0 002.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.4 3.5-6.4 3.5z"/>
    </svg>
  ),
  INSTAGRAM: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M12 2.2c3.2 0 3.6 0 4.9.1 3.3.2 4.8 1.7 5 5 .1 1.3.1 1.6.1 4.8 0 3.2 0 3.6-.1 4.8-.2 3.3-1.7 4.8-5 5-1.3.1-1.6.1-4.9.1-3.2 0-3.6 0-4.8-.1-3.3-.2-4.8-1.7-5-5C2.1 15.6 2 15.2 2 12c0-3.2 0-3.6.1-4.8.2-3.3 1.7-4.8 5-5 1.3-.1 1.7-.1 4.9-.1zm0-2.2C8.7 0 8.3 0 7 .1 2.7.3.3 2.7.1 7 0 8.3 0 8.7 0 12c0 3.3 0 3.7.1 5 .2 4.3 2.6 6.7 7 6.9 1.3.1 1.7.1 4.9.1 3.3 0 3.7 0 5-.1 4.3-.2 6.7-2.6 6.9-7 .1-1.3.1-1.7.1-5 0-3.3 0-3.7-.1-5C23.7 2.7 21.3.3 17 .1 15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 100 12.4A6.2 6.2 0 0012 5.8zm0 10.2a4 4 0 110-8 4 4 0 010 8zm6.4-11.8a1.4 1.4 0 100 2.8 1.4 1.4 0 000-2.8z"/>
    </svg>
  ),
  TIKTOK: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M12.5 0h3.3c.2 2.3 1.5 3.7 3.7 3.9v3.3c-1.3 0-2.4-.4-3.7-1.3v5.8c0 7.3-8 9.6-11.2 4.4-2-3.3-.7-9.1 5.6-9.3v3.4c-.4 0-.8.1-1.2.2-2.3.7-3.2 3.6-1.7 5.5 1.6 2 5.2 1.4 5.2-2.5V0z"/>
    </svg>
  ),
  FACEBOOK: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1C0 18.1 4.4 23.1 10.1 24v-8.4H7.1v-3.5h3V9.4c0-3 1.8-4.7 4.6-4.7 1.3 0 2.7.2 2.7.2V8h-1.5C14.4 8 14 8.9 14 9.8v2.3h3.3l-.5 3.5H14V24C19.6 23.1 24 18.1 24 12.1z"/>
    </svg>
  ),
  TELEGRAM: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M11.9 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.5 0 11.9 0zm5.9 8.2l-2 9.5c-.1.7-.6.8-1.1.5l-3-2.2-1.5 1.4c-.2.2-.4.3-.7.3l.3-3.1 6.3-5.7c.3-.2-.1-.4-.4-.2L6.2 13.4 3.3 12.5c-.7-.2-.7-.7.1-1l13-5c.6-.2 1.2.1 1 .7z"/>
    </svg>
  ),
  TWITTER_X: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  SNAPCHAT: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M12 .1C8.9.1 6.4 2.6 6.4 5.7v1.3c-.3 0-.7 0-1 .1-.3.1-.5.4-.4.7.1.3.3.4.6.4h.8c-.2.8-.6 1.5-1.1 1.9-.6.5-.7 1.3-.1 1.8.3.2.6.3 1 .3.4 0 .8-.1 1.1-.4.3.6.7 1.1 1.2 1.5.5.4.8 1 .7 1.6-.1.6-.6 1-1.2 1.1-.7.1-1.3.2-1.7.4-.5.2-.7.6-.6 1 .1.4.5.6.9.6h.2c.5.1 1.2.3 1.7.8s.7 1.1.7 1.5c0 .3.3.6.7.6.3 0 .6-.2.6-.5.1-.8.8-1.5 1.7-1.7.3 0 .7-.1 1-.1h.1c.3 0 .7.1 1 .1.9.2 1.6.9 1.7 1.7 0 .3.3.5.6.5.4 0 .7-.3.7-.6 0-.4.2-1 .7-1.5s1.2-.7 1.7-.8h.2c.4 0 .8-.2.9-.6.1-.4-.1-.8-.6-1-.4-.2-1-.3-1.7-.4-.6-.1-1.1-.5-1.2-1.1-.1-.6.2-1.2.7-1.6.5-.4.9-.9 1.2-1.5.3.3.7.4 1.1.4.4 0 .7-.1 1-.3.6-.5.5-1.3-.1-1.8-.5-.4-.9-1.1-1.1-1.9h.8c.3 0 .5-.1.6-.4.1-.3-.1-.6-.4-.7-.3-.1-.7-.1-1-.1V5.7C17.6 2.6 15.1.1 12 .1z"/>
    </svg>
  ),
  PINTEREST: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 5.1 3.2 9.5 7.7 11.3-.1-.9-.2-2.3 0-3.3.2-.9 1.3-5.6 1.3-5.6s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8 1 0 1.5.7 1.5 1.6 0 1-.6 2.5-.9 3.9-.3 1.2.6 2.1 1.7 2.1 2.1 0 3.7-2.2 3.7-5.4 0-2.8-2-4.8-4.9-4.8-3.3 0-5.3 2.5-5.3 5.1 0 1 .4 2.1.9 2.7.1.1.1.2 0 .4-.1.3-.3 1.1-.3 1.3 0 .2-.2.3-.4.2C5.6 16.8 4.5 14.7 4.5 12 4.5 8.2 7.5 4.6 12.5 4.6c4 0 7.1 2.8 7.1 6.6 0 3.9-2.5 7.1-5.9 7.1-1.1 0-2.2-.6-2.6-1.3l-.7 2.7c-.3 1-.9 2.2-1.4 2.9.8.3 1.7.4 2.6.4 6.6 0 12-5.4 12-12C24 5.4 18.6 0 12 0z"/>
    </svg>
  ),
  LINKEDIN: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M20.4 20.4h-3.4v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8v5.4h-3.4V9h3.3v1.5c.5-.9 1.6-1.7 3.3-1.7 3.5 0 4.1 2.3 4.1 5.3v6.3zM5.3 7.4a2 2 0 110-4 2 2 0 010 4zM3.6 20.4h3.4V9H3.6v11.4zM22.2 0H1.8C.8 0 0 .8 0 1.8v20.4C0 23.2.8 24 1.8 24h20.4c1 0 1.8-.8 1.8-1.8V1.8C24 .8 23.2 0 22.2 0z"/>
    </svg>
  ),
  WEBSITE: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
    </svg>
  ),
};

interface WizardState {
  platform: (typeof PLATFORMS)[number] | "";
  accountUrl: string;
  displayName: string;
  logoUrl: string;
  title: string;
  description: string;
  price: string;
  followers: string;
  engagementRate: string;
  accountAgeMonths: string;
  monetized: boolean;
  screenshots: string[];
  lifetimeViews: string;
  lifetimeRevenue: string;
  channelRpm: string;
  audienceLanguage: string;
  channelCreationDate: string;
  strikeCount: string;
  warningCount: string;
  strikeWarningContext: string;
  adsenseStatus: string;
  niche: string;
  saleType: "FIXED" | "AUCTION";
  isPrivate: boolean;
  auctionEndsAt: string;
  reservePrice: string;
  buyNowPrice: string;
  minBidIncrement: string;
}

const DRAFT_KEY = "listing_wizard_draft";

interface DraftState {
  form: WizardState;
  step: number;
  ownershipConfirmed: boolean;
}

const EMPTY: WizardState = {
  platform: "",
  accountUrl: "",
  displayName: "",
  logoUrl: "",
  title: "",
  description: "",
  price: "",
  followers: "",
  engagementRate: "",
  accountAgeMonths: "",
  monetized: false,
  screenshots: [],
  lifetimeViews: "",
  lifetimeRevenue: "",
  channelRpm: "",
  audienceLanguage: "",
  channelCreationDate: "",
  strikeCount: "",
  warningCount: "",
  strikeWarningContext: "",
  adsenseStatus: "",
  niche: "",
  saleType: "FIXED",
  isPrivate: false,
  auctionEndsAt: "",
  reservePrice: "",
  buyNowPrice: "",
  minBidIncrement: "",
};

function generateCode(): string {
  return `AM-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
}

function reviewHoursLabel(h: number): string {
  if (h <= 24) return `${h} hours`;
  const lo = Math.round(h / 2);
  return `${lo}–${h} hours`;
}


export function ListingWizard({ reviewHours = 48 }: { reviewHours?: number }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardState>(EMPTY);
  const [code, setCode] = useState("");
  useEffect(() => { setCode(generateCode()); }, []);
  const [ownershipToken, setOwnershipToken] = useState("");
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Snapshot of the state produced by draft restore (or the pristine initial
  // state when no draft existed). The auto-save below only writes once state
  // DIFFERS from this — so merely opening the page can never overwrite a
  // stored draft with an emptier one.
  const restoredSnapshotRef = useRef<string | null>(null);

  // Load draft on mount
  useEffect(() => {
    let restoredForm = EMPTY;
    let restoredStep = 1;
    let restoredOwnership = false;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft: DraftState = JSON.parse(raw);
        const f = draft?.form;
        // Restore when the draft has anything worth keeping, not only when a
        // platform was picked.
        if (f && (f.platform || f.accountUrl?.trim() || f.displayName?.trim() || f.title?.trim() || f.description?.trim())) {
          // Merge over EMPTY: drafts saved by an older version of this form
          // may miss newer fields — spreading alone would restore `undefined`
          // into controlled inputs and corrupt the state.
          restoredForm = { ...EMPTY, ...f };
          restoredStep = draft.step ?? 1;
          restoredOwnership = draft.ownershipConfirmed ?? false;
          setForm(restoredForm);
          setStep(restoredStep);
          setOwnershipConfirmed(restoredOwnership);
          setHasDraft(true);
        }
      }
    } catch { /* ignore */ }
    restoredSnapshotRef.current = JSON.stringify({ form: restoredForm, step: restoredStep, ownershipConfirmed: restoredOwnership });
    setDraftLoaded(true);
  }, []);

  // Auto-save draft whenever form/step/ownershipConfirmed changes — but only
  // once the user actually changed something relative to what was restored.
  useEffect(() => {
    if (!draftLoaded) return;
    try {
      const json = JSON.stringify({ form, step, ownershipConfirmed });
      if (json === restoredSnapshotRef.current) return;
      localStorage.setItem(DRAFT_KEY, json);
    } catch { /* ignore quota errors */ }
  }, [form, step, ownershipConfirmed, draftLoaded]);

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  }

  function startFresh() {
    clearDraft();
    setForm(EMPTY);
    setStep(1);
    setOwnershipConfirmed(false);
    setOwnershipToken("");
    setHasDraft(false);
  }
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Auto-fetch the actual channel/profile avatar via the server-side logo API.
  // Skips only when a manually-uploaded Cloudinary URL already exists.
  const tryAutoLogo = useCallback(() => {
    if (!form.accountUrl.trim() || !form.platform) return;
    const isManualUpload = form.logoUrl && !form.logoUrl.includes("duckduckgo.com") && !form.logoUrl.startsWith("/tmp-logo");
    if (isManualUpload) return;

    // Fire and forget — update logo when response arrives
    fetch("/api/listings/logo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: form.platform, accountUrl: form.accountUrl }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.logoUrl) {
          setForm((prev) => ({ ...prev, logoUrl: data.logoUrl }));
          setLogoPreviewError(false);
        }
        // Auto-fill the display name from the detected channel/profile,
        // but never overwrite something the seller already typed.
        if (data?.displayName) {
          setForm((prev) =>
            prev.displayName.trim() ? prev : { ...prev, displayName: data.displayName },
          );
        }
      })
      .catch(() => { /* silently ignore */ });
  }, [form.accountUrl, form.platform, form.logoUrl]);

  useEffect(() => {
    const t = setTimeout(tryAutoLogo, 800);
    return () => clearTimeout(t);
  }, [tryAutoLogo]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/upload/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUri }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setForm((prev) => ({ ...prev, logoUrl: data.url }));
      setLogoPreviewError(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleScreenshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remaining = 8 - form.screenshots.length;
    if (remaining <= 0) { toast.error("Maximum 8 screenshots"); if (screenshotInputRef.current) screenshotInputRef.current.value = ""; return; }

    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.error(`Only ${remaining} more allowed — ${files.length - remaining} skipped`);
    }

    setUploadingScreenshot(true);
    try {
      // Upload all selected images in parallel, keeping successful ones even if some fail.
      const results = await Promise.all(
        toUpload.map(async (file) => {
          try {
            const dataUri = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            const res = await fetch("/api/upload/listing", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ dataUri }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Upload failed");
            return data.url as string;
          } catch {
            return null;
          }
        }),
      );
      const urls = results.filter((u): u is string => Boolean(u));
      if (urls.length > 0) {
        setForm((prev) => ({ ...prev, screenshots: [...prev.screenshots, ...urls].slice(0, 8) }));
      }
      const failed = toUpload.length - urls.length;
      if (failed > 0) toast.error(`${failed} image${failed === 1 ? "" : "s"} failed to upload`);
    } finally {
      setUploadingScreenshot(false);
      if (screenshotInputRef.current) screenshotInputRef.current.value = "";
    }
  }

  const step1Valid =
    form.platform !== "" &&
    form.accountUrl.trim().length > 0 &&
    form.displayName.trim().length > 0;

  const step2Valid = form.platform
    ? platformRequiresToken(form.platform)
      ? ownershipToken.length > 0
      : ownershipConfirmed
    : false;

  const descLen = form.description.length;
  const descOver = descLen > 1000;

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: form.platform,
          accountUrl: form.accountUrl,
          displayName: form.displayName || undefined,
          logoUrl: form.logoUrl || undefined,
          title: form.title,
          description: form.description,
          price: Number(form.price),
          followers: form.followers ? Number(form.followers) : undefined,
          engagementRate: form.engagementRate ? Number(form.engagementRate) : undefined,
          accountAgeMonths: form.accountAgeMonths ? Number(form.accountAgeMonths) : undefined,
          monetized: form.monetized,
          screenshots: form.screenshots,
          lifetimeViews: form.lifetimeViews ? Number(form.lifetimeViews) : undefined,
          lifetimeRevenue: form.lifetimeRevenue ? Number(form.lifetimeRevenue) : undefined,
          channelRpm: form.channelRpm ? Number(form.channelRpm) : undefined,
          audienceLanguage: form.audienceLanguage || undefined,
          channelCreationDate: form.channelCreationDate || undefined,
          strikeCount: form.strikeCount ? Number(form.strikeCount) : undefined,
          warningCount: form.warningCount ? Number(form.warningCount) : undefined,
          strikeWarningContext: form.strikeWarningContext || undefined,
          adsenseStatus: form.adsenseStatus || undefined,
          niche: form.niche || undefined,
          saleType: form.saleType,
          isPrivate: form.isPrivate,
          auctionEndsAt: form.saleType === "AUCTION" && form.auctionEndsAt ? form.auctionEndsAt : undefined,
          reservePrice: form.saleType === "AUCTION" && form.reservePrice ? Number(form.reservePrice) : undefined,
          buyNowPrice: form.saleType === "AUCTION" && form.buyNowPrice ? Number(form.buyNowPrice) : undefined,
          minBidIncrement: form.saleType === "AUCTION" && form.minBidIncrement ? Number(form.minBidIncrement) : undefined,
          ownershipVerificationCode: code,
          ownershipVerified: ownershipToken ? true : ownershipConfirmed,
          ownershipToken: ownershipToken || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 403 && data.code === "PHONE_VERIFICATION_REQUIRED") {
        router.push(`/dashboard/verify-whatsapp?next=${encodeURIComponent("/dashboard/listings/new")}`);
        return;
      }
      if (!res.ok && res.status !== 422) throw new Error(data.error ?? "Failed to create listing");
      if (res.status === 422) {
        toast.error(data.listing?.rejectionReason ?? "Listing flagged by auto-moderation");
        return;
      }
      clearDraft();
      toast.success("Listing submitted for review!");
      router.push("/dashboard/listings");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const platformColor = form.platform
    ? PLATFORM_COLOR[form.platform as keyof typeof PLATFORM_COLOR] ?? "#888"
    : "#888";

  return (
    <div className="flex flex-col gap-6">
      {/* Draft resume banner */}
      {hasDraft && (
        <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-500/10 dark:bg-brand-950/20 dark:border-brand-900 px-4 py-2.5">
          <span className="flex items-center gap-2 text-sm text-brand-700 dark:text-brand-400 dark:text-brand-300">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Draft restored — continuing where you left off
          </span>
          <button
            type="button"
            onClick={startFresh}
            className="ml-4 shrink-0 text-xs font-medium text-brand-500 hover:text-brand-700 dark:hover:text-brand-300 transition"
          >
            Start fresh
          </button>
        </div>
      )}

      {/* Step progress */}
      <div className="flex items-center">
        {[
          { n: 1, label: "Platform" },
          { n: 2, label: "Verify" },
          { n: 3, label: "Details" },
        ].map(({ n, label }, idx) => (
          <div key={n} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors",
                step > n ? "bg-success text-white" : step === n ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30" : "border-2 border-surface-border bg-background text-muted",
              )}>
                {step > n ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : n}
              </div>
              <span className={cn("text-xs font-medium", step === n ? "text-brand-600" : "text-muted")}>{label}</span>
            </div>
            {idx < 2 && <div className={cn("mx-2 mb-5 h-0.5 flex-1 transition-colors", step > n ? "bg-success" : "bg-surface-border")} />}
          </div>
        ))}
      </div>

      <Card>
        {/* ── Step 1 ─────────────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Select platform & account</h2>
              <p className="mt-0.5 text-sm text-muted">Choose the platform where this account lives.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {PLATFORMS.map((p) => {
                const color = PLATFORM_COLOR[p as keyof typeof PLATFORM_COLOR] ?? "#888";
                const selected = form.platform === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, platform: p, logoUrl: "" })}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-xs font-semibold transition",
                      selected ? "border-transparent text-white shadow-lg" : "border-surface-border bg-background text-muted hover:border-brand-300 hover:bg-brand-500/8/50",
                    )}
                    style={selected ? { backgroundColor: color, borderColor: color } : undefined}
                  >
                    <span style={{ color: selected ? "white" : color }}>
                      {PLATFORM_ICON[p] ?? <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/></svg>}
                    </span>
                    {PLATFORM_LABEL[p as keyof typeof PLATFORM_LABEL]}
                  </button>
                );
              })}
            </div>

            <Input label="Account URL" placeholder="https://youtube.com/c/yourchannel" value={form.accountUrl} onChange={(e) => setForm({ ...form, accountUrl: e.target.value })} />
            <Input label="Display Name" placeholder="e.g. Hidayah Stories" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />

            {/* Logo */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Account Logo</label>
              <div className="flex items-center gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 overflow-hidden"
                  style={{ borderColor: form.logoUrl && !logoPreviewError ? platformColor : undefined, borderStyle: "dashed" }}
                >
                  {form.logoUrl && !logoPreviewError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.logoUrl} alt="logo" className="h-full w-full object-cover" onError={() => setLogoPreviewError(true)} />
                  ) : (
                    <span className="opacity-30" style={{ color: platformColor }}>
                      {form.platform ? (PLATFORM_ICON[form.platform] ?? null) : (
                        <svg className="h-7 w-7 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="3" width="18" height="18" rx="3"/></svg>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {form.logoUrl && !logoPreviewError && (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                      {form.logoUrl.includes("res.cloudinary.com") ? "Uploaded" : "Auto-detected"}
                    </span>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" isLoading={uploadingLogo} onClick={() => logoInputRef.current?.click()}>
                      {form.logoUrl && !logoPreviewError ? "Replace" : "Upload logo"}
                    </Button>
                    {form.logoUrl && (
                      <Button type="button" variant="outline" size="sm" onClick={() => { setForm((p) => ({ ...p, logoUrl: "" })); setLogoPreviewError(false); }} className="text-muted">
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted">Auto-detected from URL, or upload manually</p>
                </div>
              </div>
            </div>

            <Button disabled={!step1Valid} onClick={() => setStep(2)} className="w-fit self-end">Continue →</Button>
          </div>
        )}

        {/* ── Step 2 ─────────────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Verify ownership</h2>
              <p className="mt-0.5 text-sm text-muted">Prove you own the account before listing it.</p>
            </div>
            {form.platform && (
              <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-white" style={{ backgroundColor: platformColor }}>
                <span className="text-white">{PLATFORM_ICON[form.platform]}</span>
                <div>
                  <p className="text-sm font-bold">{form.displayName || form.accountUrl}</p>
                  <p className="text-xs opacity-70">{PLATFORM_LABEL[form.platform as keyof typeof PLATFORM_LABEL]}</p>
                </div>
              </div>
            )}
            <OwnershipVerifier
              platform={form.platform}
              accountUrl={form.accountUrl}
              code={code}
              onVerified={(token) => { setOwnershipToken(token); setOwnershipConfirmed(false); }}
              onManualConfirm={() => { setOwnershipToken(""); setOwnershipConfirmed((v) => !v); }}
              manualConfirmed={ownershipConfirmed}
            />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
              <Button disabled={!step2Valid} onClick={() => setStep(3)}>Continue →</Button>
            </div>
          </div>
        )}

        {/* ── Step 3 ─────────────────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Listing details</h2>
              <p className="mt-0.5 text-sm text-muted">Fill in everything buyers need to evaluate your account.</p>
            </div>

            {/* Channel preview */}
            <div className="flex items-center gap-4 rounded-2xl p-4 text-white" style={{ backgroundColor: platformColor }}>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20 overflow-hidden">
                {form.logoUrl && !logoPreviewError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logoUrl} alt="logo" className="h-full w-full object-cover" onError={() => setLogoPreviewError(true)} />
                ) : (
                  <span className="text-2xl font-bold text-white">{form.displayName.slice(0, 1).toUpperCase() || "?"}</span>
                )}
              </div>
              <div>
                <p className="text-lg font-bold leading-tight">{form.displayName || "—"}</p>
                {form.followers && <p className="text-sm opacity-80">{Number(form.followers).toLocaleString()} followers</p>}
                <p className="text-xs opacity-60 uppercase tracking-wide mt-0.5">{PLATFORM_LABEL[form.platform as keyof typeof PLATFORM_LABEL] ?? form.platform}</p>
              </div>
            </div>

            <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. 50K Fitness Instagram, high engagement" />

            <div className="grid grid-cols-2 gap-4">
              <Input label="Price (USD)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <Input label="Followers" type="number" value={form.followers} onChange={(e) => setForm({ ...form, followers: e.target.value })} />
              <Input label="Engagement rate (%)" type="number" value={form.engagementRate} onChange={(e) => setForm({ ...form, engagementRate: e.target.value })} />
              <Input label="Account age (months)" type="number" value={form.accountAgeMonths} onChange={(e) => setForm({ ...form, accountAgeMonths: e.target.value })} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Monetized?</label>
              <div className="flex gap-2">
                {([true, false] as const).map((v) => (
                  <button key={String(v)} type="button" onClick={() => setForm({ ...form, monetized: v })}
                    className={cn("rounded-xl border px-5 py-2 text-sm font-medium transition", form.monetized === v ? "border-brand-500 bg-brand-500/10 text-brand-700" : "border-surface-border bg-background text-muted hover:border-brand-300")}>
                    {v ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Textarea label="Description" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Stats, niche, engagement, reason for selling..." />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted" />
                <span className={cn("text-xs tabular-nums", descOver ? "text-danger font-semibold" : "text-muted")}>{descLen}/1000</span>
              </div>
              {containsContactInfo(form.description) && (
                <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-danger">Links &amp; phone numbers are not allowed</p>
                    <p className="mt-0.5 text-xs text-danger/80">
                      Remove any URLs or phone numbers from your description. Use AccsMarkets secure messaging to share contact details with buyers.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Niche / Category</label>
              <select
                value={form.niche}
                onChange={(e) => setForm({ ...form, niche: e.target.value })}
                className="rounded-xl border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none"
              >
                <option value="">— Select a niche —</option>
                {["Gaming","Islamic / Religious","Finance","Fitness / Health","Fashion / Beauty","Technology","Travel","Food","Education","Entertainment","News / Politics","Sports","Music","Business","Lifestyle","Other"].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Description Rules
              </p>
              <ul className="space-y-0.5">{DESCRIPTION_RULES.map((rule) => <li key={rule} className="text-xs text-amber-700 dark:text-amber-400">· {rule}</li>)}</ul>
            </div>

            <div className="rounded-xl border border-surface-border bg-surface p-4">
              <p className="mb-3 text-sm font-medium">Sale type</p>
              <div className="flex gap-2">
                {(["FIXED", "AUCTION"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, saleType: t })}
                    className={cn("flex flex-1 flex-col items-center gap-1.5 rounded-xl border py-3 text-sm font-medium transition", form.saleType === t ? "border-brand-500 bg-brand-500/10 text-brand-700" : "border-surface-border bg-background text-muted hover:border-brand-300")}>
                    {t === "FIXED" ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                    )}
                    {t === "FIXED" ? "Fixed price" : "Auction"}
                  </button>
                ))}
              </div>
              {form.saleType === "AUCTION" && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-sm font-medium">Auction end date</label>
                    <input type="datetime-local" value={form.auctionEndsAt} onChange={(e) => setForm({ ...form, auctionEndsAt: e.target.value })} className="h-10 rounded-xl border border-surface-border bg-background px-3 text-sm focus:border-brand-400 focus:outline-none" />
                  </div>
                  <Input label="Reserve price (USD)" type="number" value={form.reservePrice} onChange={(e) => setForm({ ...form, reservePrice: e.target.value })} placeholder="Minimum acceptable bid" />
                  <Input label="Buy Now price (USD)" type="number" value={form.buyNowPrice} onChange={(e) => setForm({ ...form, buyNowPrice: e.target.value })} placeholder="Optional instant purchase" />
                  <Input label="Min bid increment (USD)" type="number" value={form.minBidIncrement} onChange={(e) => setForm({ ...form, minBidIncrement: e.target.value })} placeholder="e.g. 10" />
                </div>
              )}
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm cursor-pointer hover:border-brand-300 transition">
              <input type="checkbox" checked={form.isPrivate} onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })} className="h-4 w-4 rounded border-surface-border text-brand-500 focus:ring-brand-300" />
              <div>
                <p className="font-medium text-foreground">Private listing</p>
                <p className="text-xs text-muted">Only visible to buyers you invite</p>
              </div>
            </label>

            <div className="rounded-xl border border-surface-border bg-surface p-4">
              <div className="mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <p className="text-sm font-medium">Channel Analytics <span className="font-normal text-muted">(optional — improves buyer trust)</span></p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Lifetime views" type="number" value={form.lifetimeViews} onChange={(e) => setForm({ ...form, lifetimeViews: e.target.value })} placeholder="e.g. 5000000" />
                <Input label="Lifetime revenue (USD)" type="number" value={form.lifetimeRevenue} onChange={(e) => setForm({ ...form, lifetimeRevenue: e.target.value })} placeholder="e.g. 3200" />
                <Input label="Channel RPM (USD)" type="number" value={form.channelRpm} onChange={(e) => setForm({ ...form, channelRpm: e.target.value })} placeholder="e.g. 4.50" />
                <Input label="Primary audience language" value={form.audienceLanguage} onChange={(e) => setForm({ ...form, audienceLanguage: e.target.value })} placeholder="e.g. English" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">AdSense status</label>
                  <select value={form.adsenseStatus} onChange={(e) => setForm({ ...form, adsenseStatus: e.target.value })} className="h-10 rounded-xl border border-surface-border bg-background px-3 text-sm focus:border-brand-400 focus:outline-none">
                    <option value="">— Select —</option><option value="ON">Enabled</option><option value="OFF">Disabled</option><option value="CHANGEABLE">Changeable</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Channel creation date</label>
                  <input type="date" value={form.channelCreationDate} onChange={(e) => setForm({ ...form, channelCreationDate: e.target.value })} className="h-10 rounded-xl border border-surface-border bg-background px-3 text-sm focus:border-brand-400 focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Strike count</label>
                  <input type="number" min={0} value={form.strikeCount} onChange={(e) => setForm({ ...form, strikeCount: e.target.value })} placeholder="0" className="h-10 rounded-xl border border-surface-border bg-background px-3 text-sm focus:border-brand-400 focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Warning count</label>
                  <input type="number" min={0} value={form.warningCount} onChange={(e) => setForm({ ...form, warningCount: e.target.value })} placeholder="0" className="h-10 rounded-xl border border-surface-border bg-background px-3 text-sm focus:border-brand-400 focus:outline-none" />
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1">
                <label className="text-sm font-medium">Context <span className="font-normal text-muted">(optional)</span></label>
                <textarea rows={3} maxLength={300} value={form.strikeWarningContext} onChange={(e) => setForm({ ...form, strikeWarningContext: e.target.value })} placeholder="e.g. 1 copyright strike from 2023, resolved" className="resize-none rounded-xl border border-surface-border bg-background px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Screenshots <span className="font-normal text-muted">(optional — up to 8)</span></p>
              <input ref={screenshotInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleScreenshotUpload} />
              {form.screenshots.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.screenshots.map((url, i) => (
                    <div key={url} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Screenshot ${i + 1}`} className="h-20 w-28 rounded-xl object-cover border border-surface-border" />
                      <button type="button" onClick={() => setForm((prev) => ({ ...prev, screenshots: prev.screenshots.filter((_, j) => j !== i) }))} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white text-xs leading-none shadow">×</button>
                    </div>
                  ))}
                </div>
              )}
              <Button type="button" variant="outline" size="sm" isLoading={uploadingScreenshot} disabled={form.screenshots.length >= 8} onClick={() => screenshotInputRef.current?.click()} className="w-fit">
                Add screenshots {form.screenshots.length > 0 && `(${form.screenshots.length}/8)`}
              </Button>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface px-4 py-3">
              <svg className="h-5 w-5 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-xs text-muted">
                Reviewed within <strong className="text-foreground">{reviewHoursLabel(reviewHours)}</strong>. Ensure all details are accurate.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
              <Button isLoading={loading} disabled={form.title.length < 5 || descLen < 20 || descOver || !form.price} onClick={handleSubmit}>Submit Listing</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
