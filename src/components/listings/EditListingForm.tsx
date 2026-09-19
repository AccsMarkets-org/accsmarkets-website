"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/utils";
import { containsContactInfo } from "@/lib/validation/listing";
import type { Listing } from "@prisma/client";

const PLATFORMS = [
  { value: "YOUTUBE",   label: "YouTube",   color: "#FF0000" },
  { value: "INSTAGRAM", label: "Instagram", color: "#E1306C" },
  { value: "TIKTOK",    label: "TikTok",    color: "#010101" },
  { value: "FACEBOOK",  label: "Facebook",  color: "#1877F2" },
  { value: "TELEGRAM",  label: "Telegram",  color: "#2AABEE" },
  { value: "TWITTER_X", label: "Twitter/X", color: "#1DA1F2" },
  { value: "SNAPCHAT",  label: "Snapchat",  color: "#FFFC00" },
  { value: "PINTEREST", label: "Pinterest", color: "#E60023" },
  { value: "LINKEDIN",  label: "LinkedIn",  color: "#0077B5" },
  { value: "WEBSITE",   label: "Website",   color: "#6366f1" },
];

const SECTIONS = [
  { id: "basic",     label: "Basic Info",       icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg> },
  { id: "account",   label: "Account Details",  icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
  { id: "analytics", label: "Analytics",        icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { id: "health",    label: "Account Health",   icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
  { id: "media",     label: "Screenshots",      icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
];

interface Props { listing: Listing }

export function EditListingForm({ listing }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Basic
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [price, setPrice] = useState(listing.price.toString());
  const [accountUrl, setAccountUrl] = useState((listing as any).accountUrl ?? "");
  const [displayName, setDisplayName] = useState((listing as any).displayName ?? "");
  const [saleType, setSaleType] = useState<"FIXED" | "AUCTION">((listing as any).saleType ?? "FIXED");

  // Account
  const [followers, setFollowers] = useState((listing as any).followers?.toString() ?? "");
  const [engagementRate, setEngagementRate] = useState((listing as any).engagementRate?.toString() ?? "");
  const [accountAgeMonths, setAccountAgeMonths] = useState((listing as any).accountAgeMonths?.toString() ?? "");
  const [monetized, setMonetized] = useState<boolean>((listing as any).monetized ?? false);
  const [audienceLanguage, setAudienceLanguage] = useState((listing as any).audienceLanguage ?? "");
  const [channelCreationDate, setChannelCreationDate] = useState(
    (listing as any).channelCreationDate
      ? new Date((listing as any).channelCreationDate).toISOString().slice(0, 10)
      : ""
  );

  // Analytics
  const [lifetimeViews, setLifetimeViews] = useState((listing as any).lifetimeViews?.toString() ?? "");
  const [lifetimeRevenue, setLifetimeRevenue] = useState((listing as any).lifetimeRevenue?.toString() ?? "");
  const [channelRpm, setChannelRpm] = useState((listing as any).channelRpm?.toString() ?? "");

  // Health
  const [strikeCount, setStrikeCount] = useState((listing as any).strikeCount?.toString() ?? "0");
  const [warningCount, setWarningCount] = useState((listing as any).warningCount?.toString() ?? "0");
  const [strikeWarningContext, setStrikeWarningContext] = useState((listing as any).strikeWarningContext ?? "");
  const [adsenseStatus, setAdsenseStatus] = useState<"ON" | "OFF" | "CHANGEABLE" | "">((listing as any).adsenseStatus ?? "");
  const [niche, setNiche] = useState<string>((listing as any).niche ?? "");

  // Logo
  const [logoUrl, setLogoUrl] = useState<string>((listing as any).accountLogo ?? "");
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Screenshots
  const [screenshots, setScreenshots] = useState<string[]>((listing as any).screenshots ?? []);

  const platform = (listing as any).platform ?? "YOUTUBE";

  async function uploadFile(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload/listing", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return data.url as string;
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const url = await uploadFile(file);
      if (url) setLogoUrl(url);
    } catch {
      toast.error("Logo upload failed");
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  }

  async function handleAddPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (screenshots.length + files.length > 10) {
      toast.error("Maximum 10 screenshots");
      return;
    }
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadFile));
      setScreenshots((prev) => [...prev, ...urls.filter(Boolean) as string[]]);
    } catch {
      toast.error("Failed to upload one or more images");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleReplacePhoto(index: number, file: File) {
    setUploading(true);
    try {
      const url = await uploadFile(file);
      if (url) {
        setScreenshots((prev) => prev.map((s, i) => (i === index ? url : s)));
      }
    } catch {
      toast.error("Replace failed");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(index: number) {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  }

  function movePhoto(from: number, to: number) {
    if (to < 0 || to >= screenshots.length) return;
    setScreenshots((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        screenshots,
        saleType,
      };
      if (accountUrl.trim()) body.accountUrl = accountUrl.trim();
      if (displayName.trim()) body.displayName = displayName.trim();
      body.logoUrl = logoUrl || null;
      if (followers) body.followers = Number(followers);
      if (engagementRate) body.engagementRate = Number(engagementRate);
      if (accountAgeMonths) body.accountAgeMonths = Number(accountAgeMonths);
      body.monetized = monetized;
      if (audienceLanguage.trim()) body.audienceLanguage = audienceLanguage.trim();
      if (channelCreationDate) body.channelCreationDate = channelCreationDate;
      if (lifetimeViews) body.lifetimeViews = Number(lifetimeViews);
      if (lifetimeRevenue) body.lifetimeRevenue = Number(lifetimeRevenue);
      if (channelRpm) body.channelRpm = Number(channelRpm);
      if (strikeCount) body.strikeCount = Number(strikeCount);
      if (warningCount) body.warningCount = Number(warningCount);
      if (strikeWarningContext.trim()) body.strikeWarningContext = strikeWarningContext.trim();
      if (adsenseStatus) body.adsenseStatus = adsenseStatus;
      body.niche = niche || null;

      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      if (data.blocked) {
        toast.error(data.listing?.rejectionReason ?? "Listing flagged by auto-moderation");
      } else {
        toast.success("Listing updated and resubmitted for review");
      }
      router.push("/dashboard/listings");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const plt = PLATFORMS.find((p) => p.value === platform);

  return (
    <div className="flex flex-col gap-6">
      {/* Platform badge */}
      <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface px-4 py-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black text-white shadow-sm"
          style={{ backgroundColor: plt?.color ?? "#888" }}
        >
          {(plt?.label ?? platform).slice(0, 2).toUpperCase()}
        </span>
        <div>
          <p className="text-xs text-muted">Platform (fixed)</p>
          <p className="text-sm font-bold text-foreground">{plt?.label ?? platform}</p>
        </div>
        <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          editing resubmits for review
        </span>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSection(s.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition",
              activeSection === s.id
                ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                : "border border-surface-border bg-surface text-muted hover:text-foreground hover:border-brand-200",
            )}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* ── Basic Info ─────────────────────────────────────────────────── */}
        {activeSection === "basic" && (
          <div className="flex flex-col gap-4">
            <Field label="Listing title" hint={`${title.length}/120`}>
              <input
                className={inputCls}
                maxLength={120}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. YouTube channel – Tech niche, 45K subs"
              />
            </Field>

            <Field label="Description" hint={`${description.length}/1000`}>
              <textarea
                className={cn(inputCls, "min-h-[120px] resize-y")}
                maxLength={1000}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the account: niche, audience, monetization history, why selling..."
              />
              {containsContactInfo(description) && (
                <div className="mt-1.5 flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-50 px-3 py-2.5 dark:bg-red-900/10">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">Links &amp; phone numbers are not allowed</p>
                    <p className="mt-0.5 text-xs text-red-500/80 dark:text-red-400/70">
                      Remove any URLs or phone numbers. Use AccsMarkets secure messaging to share contact details with buyers.
                    </p>
                  </div>
                </div>
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Price (USD)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
                  <input
                    className={cn(inputCls, "pl-7")}
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </Field>
              <Field label="Sale type">
                <select
                  className={inputCls}
                  value={saleType}
                  onChange={(e) => setSaleType(e.target.value as "FIXED" | "AUCTION")}
                >
                  <option value="FIXED">Fixed price</option>
                  <option value="AUCTION">Auction</option>
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name" hint="Channel / account name shown publicly">
                <input
                  className={inputCls}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="@handle or channel name"
                />
              </Field>
              <Field label="Account URL">
                <input
                  className={inputCls}
                  type="url"
                  value={accountUrl}
                  onChange={(e) => setAccountUrl(e.target.value)}
                  placeholder="https://youtube.com/c/..."
                />
              </Field>
            </div>
          </div>
        )}

        {/* ── Account Details ────────────────────────────────────────────── */}
        {activeSection === "account" && (
          <div className="flex flex-col gap-4">
            {/* Logo upload */}
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            <Field label="Account logo / avatar">
              <div className="flex items-center gap-4">
                <div
                  className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-surface-border bg-surface hover:border-brand-400 transition"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="logo" className="h-full w-full object-cover" />
                  ) : (
                    <svg className="h-6 w-6 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  )}
                  {logoUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="rounded-xl border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand-400 hover:text-brand-600 transition disabled:opacity-50"
                  >
                    {logoUploading ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
                  </button>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </Field>

            {/* Niche */}
            <Field label="Niche / Category">
              <select
                className={inputCls}
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              >
                <option value="">— Select a niche —</option>
                {["Gaming","Islamic / Religious","Finance","Fitness / Health","Fashion / Beauty","Technology","Travel","Food","Education","Entertainment","News / Politics","Sports","Music","Business","Lifestyle","Other"].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Followers / subscribers">
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  value={followers}
                  onChange={(e) => setFollowers(e.target.value)}
                  placeholder="45000"
                />
              </Field>
              <Field label="Engagement rate (%)" hint="Average likes+comments/post">
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={engagementRate}
                  onChange={(e) => setEngagementRate(e.target.value)}
                  placeholder="3.5"
                />
              </Field>
              <Field label="Account age (months)">
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  value={accountAgeMonths}
                  onChange={(e) => setAccountAgeMonths(e.target.value)}
                  placeholder="36"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Audience language">
                <input
                  className={inputCls}
                  value={audienceLanguage}
                  onChange={(e) => setAudienceLanguage(e.target.value)}
                  placeholder="English, Spanish..."
                />
              </Field>
              <Field label="Channel creation date">
                <input
                  className={inputCls}
                  type="date"
                  value={channelCreationDate}
                  onChange={(e) => setChannelCreationDate(e.target.value)}
                />
              </Field>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-surface-border bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Monetized</p>
                <p className="text-xs text-muted">Account is actively earning revenue</p>
              </div>
              <Toggle checked={monetized} onChange={setMonetized} />
            </div>
          </div>
        )}

        {/* ── Analytics ─────────────────────────────────────────────────── */}
        {activeSection === "analytics" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-brand-100 bg-brand-50/40 px-4 py-3 text-xs text-brand-700 dark:border-brand-800 dark:bg-brand-950/10 dark:text-brand-400">
              These fields are optional but boost buyer confidence. All values are self-reported.
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Lifetime views">
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  value={lifetimeViews}
                  onChange={(e) => setLifetimeViews(e.target.value)}
                  placeholder="12000000"
                />
              </Field>
              <Field label="Lifetime revenue (USD)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
                  <input
                    className={cn(inputCls, "pl-7")}
                    type="number"
                    min="0"
                    step="0.01"
                    value={lifetimeRevenue}
                    onChange={(e) => setLifetimeRevenue(e.target.value)}
                    placeholder="4500.00"
                  />
                </div>
              </Field>
              <Field label="Channel RPM (USD)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
                  <input
                    className={cn(inputCls, "pl-7")}
                    type="number"
                    min="0"
                    step="0.01"
                    value={channelRpm}
                    onChange={(e) => setChannelRpm(e.target.value)}
                    placeholder="2.50"
                  />
                </div>
              </Field>
            </div>
          </div>
        )}

        {/* ── Account Health ─────────────────────────────────────────────── */}
        {activeSection === "health" && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Strikes" hint="Community guideline strikes">
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  max="10"
                  value={strikeCount}
                  onChange={(e) => setStrikeCount(e.target.value)}
                />
              </Field>
              <Field label="Warnings" hint="Policy warnings">
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  max="10"
                  value={warningCount}
                  onChange={(e) => setWarningCount(e.target.value)}
                />
              </Field>
              <Field label="AdSense status">
                <select
                  className={inputCls}
                  value={adsenseStatus}
                  onChange={(e) => setAdsenseStatus(e.target.value as "ON" | "OFF" | "CHANGEABLE" | "")}
                >
                  <option value="">Not applicable</option>
                  <option value="ON">On — linked &amp; active</option>
                  <option value="CHANGEABLE">Changeable — can be relinked</option>
                  <option value="OFF">Off — suspended / disconnected</option>
                </select>
              </Field>
            </div>

            {(Number(strikeCount) > 0 || Number(warningCount) > 0) && (
              <Field label="Strike / warning context" hint={`${strikeWarningContext.length}/300`}>
                <textarea
                  className={cn(inputCls, "min-h-[80px] resize-y")}
                  maxLength={300}
                  value={strikeWarningContext}
                  onChange={(e) => setStrikeWarningContext(e.target.value)}
                  placeholder="Briefly explain the strikes or warnings so buyers know the situation..."
                />
              </Field>
            )}

            {/* Health summary */}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
              {[
                { label: "Strikes",  value: strikeCount || "0",  bad: Number(strikeCount) > 0 },
                { label: "Warnings", value: warningCount || "0", bad: Number(warningCount) > 0 },
                { label: "AdSense",  value: adsenseStatus || "N/A", bad: adsenseStatus === "OFF" },
              ].map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-center",
                    item.bad ? "border-danger/30 bg-danger/5" : "border-success/30 bg-success/5",
                  )}
                >
                  <p className={cn("text-lg font-black", item.bad ? "text-danger" : "text-success")}>
                    {item.value}
                  </p>
                  <p className="text-[10px] font-medium text-muted">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Screenshots ───────────────────────────────────────────────── */}
        {activeSection === "media" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{screenshots.length} / 10 screenshots</p>
                <p className="text-xs text-muted">First image is the cover. Drag arrows to reorder.</p>
              </div>
              <button
                type="button"
                disabled={screenshots.length >= 10 || uploading}
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
                )}
                Add photos
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddPhotos} />
            </div>

            {screenshots.length === 0 ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-surface-border py-12 text-center transition hover:border-brand-300 hover:bg-brand-500/8/30"
              >
                <svg className="h-10 w-10 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <div>
                  <p className="text-sm font-semibold text-foreground">Upload screenshots</p>
                  <p className="text-xs text-muted">PNG, JPG, WEBP · up to 10 images</p>
                </div>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {screenshots.map((url, i) => (
                  <PhotoCard
                    key={url + i}
                    url={url}
                    index={i}
                    total={screenshots.length}
                    isCover={i === 0}
                    onRemove={() => removePhoto(i)}
                    onMoveLeft={() => movePhoto(i, i - 1)}
                    onMoveRight={() => movePhoto(i, i + 1)}
                    onReplace={(file) => handleReplacePhoto(i, file)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Footer actions ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-t border-surface-border pt-4">
          <Button type="submit" isLoading={loading} className="flex-1 sm:flex-none sm:w-48">
            Save &amp; resubmit
          </Button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/listings")}
            className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium text-muted transition hover:text-foreground hover:border-brand-200"
          >
            Cancel
          </button>
          <p className="ml-auto hidden text-xs text-muted sm:block">Editing resubmits for admin review</p>
        </div>
      </form>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-xs font-semibold text-foreground">{label}</label>
        {hint && <span className="text-[10px] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function PhotoCard({
  url, index, total, isCover, onRemove, onMoveLeft, onMoveRight, onReplace,
}: {
  url: string; index: number; total: number; isCover: boolean;
  onRemove: () => void; onMoveLeft: () => void; onMoveRight: () => void;
  onReplace: (f: File) => void;
}) {
  const replaceRef = useRef<HTMLInputElement>(null);
  return (
    <div className="group relative overflow-hidden rounded-xl border border-surface-border bg-surface">
      <div className="relative aspect-video w-full">
        <Image src={url} alt={`Screenshot ${index + 1}`} fill className="object-cover" sizes="(max-width:640px) 50vw, 33vw" />
      </div>
      {isCover && (
        <span className="absolute left-2 top-2 rounded-full bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
          COVER
        </span>
      )}
      {/* Overlay toolbar */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex items-center justify-between gap-1 px-2 pb-2">
          <div className="flex gap-1">
            <IconBtn disabled={index === 0} onClick={onMoveLeft} title="Move left">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path d="M10.5 3.5L5.5 8l5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
            </IconBtn>
            <IconBtn disabled={index === total - 1} onClick={onMoveRight} title="Move right">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path d="M5.5 3.5l5 4.5-5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
            </IconBtn>
          </div>
          <div className="flex gap-1">
            <IconBtn onClick={() => replaceRef.current?.click()} title="Replace">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3 w-3"><path d="M2 9a5 5 0 1010 0A5 5 0 002 9z"/><path d="M14 2l-3 3 3 3"/></svg>
            </IconBtn>
            <IconBtn onClick={onRemove} title="Remove" danger>
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
            </IconBtn>
          </div>
        </div>
      </div>
      <input
        ref={replaceRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onReplace(f); e.target.value = ""; }}
      />
    </div>
  );
}

function IconBtn({ children, onClick, disabled, title, danger }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; title?: string; danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-lg text-white transition",
        danger ? "bg-danger/80 hover:bg-danger" : "bg-white/20 hover:bg-white/40",
        disabled && "cursor-not-allowed opacity-30",
      )}
    >
      {children}
    </button>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-surface-border bg-background px-3 text-sm text-foreground placeholder:text-muted/60 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition";
