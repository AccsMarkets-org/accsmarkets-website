"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { COUNTRIES } from "@/lib/constants";

interface SocialLinks {
  twitter?: string;
  instagram?: string;
  youtube?: string;
  website?: string;
}

interface Props {
  initialName: string;
  initialUsername: string;
  initialBio?: string;
  initialSocialLinks?: SocialLinks;
  initialImage?: string | null;
  initialCountryCode?: string | null;
  /** Phone number on file from PhoneVerification (display-only). */
  initialPhone?: string | null;
  /** True when kycLevel is PHONE or ID_VERIFIED and verifiedAt is set. */
  phoneVerified?: boolean;
}

function completeness(name: string, username: string, bio: string, links: SocialLinks, image: string | null, countryCode: string): number {
  let score = 0;
  if (name.trim())     score += 20;
  if (username.trim()) score += 20;
  if (bio.trim())      score += 20;
  if (Object.values(links).some((v) => v?.trim())) score += 20;
  if (image)           score += 10;
  if (countryCode)     score += 10;
  return Math.min(score, 100);
}

export function ProfileForm({ initialName, initialUsername, initialBio = "", initialSocialLinks = {}, initialImage = null, initialCountryCode = null, initialPhone = null, phoneVerified = false }: Props) {
  const { update: updateSession } = useSession();
  const [name,        setName]        = useState(initialName);
  const [username,    setUsername]    = useState(initialUsername);
  const [bio,         setBio]         = useState(initialBio);
  const [links,       setLinks]       = useState<SocialLinks>(initialSocialLinks);
  const [image,       setImage]       = useState<string | null>(initialImage ?? null);
  const [countryCode, setCountryCode] = useState<string>(initialCountryCode ?? "");
  const [loading,     setLoading]     = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pct = completeness(name, username, bio, links, image, countryCode);

  function setLink(key: keyof SocialLinks, val: string) {
    setLinks((l) => ({ ...l, [key]: val }));
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUri }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setImage(data.url);
      // Persist immediately so the avatar updates in the header
      const saveRes = await fetch("/api/user/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, bio, socialLinks: links, image: data.url, countryCode: countryCode || null }),
      });
      if (!saveRes.ok) {
        const saveData = await saveRes.json().catch(() => null);
        throw new Error(saveData?.error ?? "Failed to save profile photo");
      }
      await updateSession();
      toast.success("Photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/user/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, bio, socialLinks: links, image, countryCode: countryCode || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      await updateSession();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {image ? (
            <Image
              src={image}
              alt="Profile photo"
              width={72}
              height={72}
              className="h-[72px] w-[72px] rounded-full object-cover border-2 border-surface-border"
            />
          ) : (
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-2xl font-bold text-brand-600 dark:text-brand-400 border-2 border-surface-border">
              {name.slice(0, 1).toUpperCase() || "?"}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {image ? "Change photo" : "Upload photo"}
          </Button>
          {image && (
            <button
              type="button"
              onClick={() => setImage(null)}
              className="text-xs text-muted hover:text-danger transition"
            >
              Remove photo
            </button>
          )}
          <p className="text-[11px] text-muted">JPG, PNG or WebP · max 5 MB</p>
        </div>
      </div>

      {/* Completeness bar */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>Profile completeness</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-border">
          <div
            className={`h-2 rounded-full transition-all ${pct === 100 ? "bg-success" : "bg-brand-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <Input label="Display name" required value={name} onChange={(e) => setName(e.target.value)} />
      <Input
        label="Username"
        required
        value={username}
        onChange={(e) => setUsername(e.target.value.toLowerCase())}
      />

      {/* Phone number — display-only; links to verification flow */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-foreground">
          Phone number <span className="text-muted font-normal">(optional)</span>
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm text-foreground min-h-[40px] flex items-center">
            {initialPhone ? (
              <span>{initialPhone}</span>
            ) : (
              <span className="text-muted">Not set</span>
            )}
          </div>
          {phoneVerified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Verified
            </span>
          ) : (
            <a
              href="/dashboard/settings/verification"
              className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning hover:bg-warning/20 transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Verify
            </a>
          )}
        </div>
        <p className="text-xs text-muted">
          {phoneVerified ? "Your phone number is verified." : "Verify your phone number to increase your trust score."}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-foreground">Bio <span className="text-muted font-normal">(optional, max 300 chars)</span></label>
        <textarea
          className="min-h-[80px] w-full rounded-xl border border-surface-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={300}
          placeholder="Tell buyers or sellers a little about yourself…"
        />
        <span className="self-end text-xs text-muted">{bio.length}/300</span>
      </div>

      {/* Country */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-foreground">
          Country <span className="text-muted font-normal">(optional)</span>
        </label>
        <div className="relative">
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="w-full appearance-none rounded-xl border border-surface-border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">— Select country —</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Social links <span className="text-muted font-normal">(optional)</span></p>
        {(["twitter", "instagram", "youtube", "website"] as const).map((key) => (
          <Input
            key={key}
            label={key.charAt(0).toUpperCase() + key.slice(1)}
            type="url"
            value={links[key] ?? ""}
            onChange={(e) => setLink(key, e.target.value)}
            placeholder={`https://${key === "website" ? "example.com" : `${key}.com/yourhandle`}`}
          />
        ))}
      </div>

      <Button type="submit" isLoading={loading} className="w-fit">
        Save changes
      </Button>
    </form>
  );
}
