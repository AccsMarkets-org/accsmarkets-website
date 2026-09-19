"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { platformRequiresToken } from "@/lib/ownership-platforms";

export { platformRequiresToken };

// API-verified: server calls the platform's API to confirm the code is in the description
const API_PLATFORMS: Record<string, { endpoint: string; instructions: string }> = {
  YOUTUBE: {
    endpoint: "/api/listings/verify/youtube",
    instructions:
      "Add the code to your YouTube channel description (YouTube Studio → Customization → Basic Info → Description), then click Check now. We verify it via the YouTube API.",
  },
  TELEGRAM: {
    endpoint: "/api/listings/verify/telegram",
    instructions:
      "Add the code to your Telegram channel or group description, then click Check now. We verify it via the Telegram Bot API.",
  },
};

// Manual: seller ticks a checkbox and admin verifies during listing review
const MANUAL_PLATFORM_INSTRUCTIONS: Record<string, string> = {
  INSTAGRAM: "Add the code to your Instagram bio. An admin will verify it during listing review.",
  TIKTOK: "Add the code to your TikTok bio. An admin will verify it during listing review.",
  TWITTER_X: "Add the code to your X (Twitter) bio. An admin will verify it during listing review.",
  FACEBOOK: "Add the code to your Facebook page About section. An admin will verify it during listing review.",
  SNAPCHAT: "Add the code to your Snapchat profile. An admin will verify it during listing review.",
  PINTEREST: "Add the code to your Pinterest bio. An admin will verify it during listing review.",
  LINKEDIN: "Add the code to your LinkedIn About section. An admin will verify it during listing review.",
  WEBSITE: "Add the code anywhere visible on your website (footer, about page, meta description). An admin will verify it during listing review.",
};

interface Props {
  platform: string;
  accountUrl: string;
  code: string;
  onVerified: (token: string) => void;
  onManualConfirm: () => void;
  manualConfirmed: boolean;
}

export function OwnershipVerifier({
  platform,
  accountUrl,
  code,
  onVerified,
  onManualConfirm,
  manualConfirmed,
}: Props) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);

  const apiConfig = API_PLATFORMS[platform];
  const manualInstructions = MANUAL_PLATFORM_INSTRUCTIONS[platform];

  async function handleApiCheck() {
    if (!apiConfig) return;
    setChecking(true);
    setError("");
    try {
      const res = await fetch(apiConfig.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountUrl, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verification failed");
        return;
      }
      setVerified(true);
      onVerified(data.token);
    } catch {
      setError("Network error, please try again.");
    } finally {
      setChecking(false);
    }
  }

  if (verified) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-4 text-sm text-success">
        <span className="text-lg">✓</span>
        <span className="font-medium">Ownership verified automatically</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CodeDisplay code={code} />

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </p>
      )}

      {apiConfig ? (
        // API-verified platform (YouTube, Telegram)
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">{apiConfig.instructions}</p>
          <Button onClick={handleApiCheck} isLoading={checking} className="w-fit">
            Check now
          </Button>
        </div>
      ) : (
        // Manual platform (Instagram, TikTok, Facebook, Twitter/X, etc.)
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm text-warning-foreground">
            <span className="font-medium">Manual verification</span> — this platform does not have
            a public API. An admin will check your account during listing review.
          </div>
          <p className="text-sm text-muted">
            {manualInstructions ?? "Add the code to your account bio/description. An admin will verify it during listing review."}
          </p>
          <ManualCheckbox confirmed={manualConfirmed} onConfirm={onManualConfirm} />
        </div>
      )}
    </div>
  );
}

function CodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-brand-300 bg-brand-500/10 p-4 dark:border-brand-700"
      onClick={copy}
      title="Click to copy"
    >
      <span className="font-mono text-lg font-bold text-brand-700 dark:text-brand-400">{code}</span>
      <span className={cn("text-xs", copied ? "text-success" : "text-muted")}>
        {copied ? "Copied!" : "Click to copy"}
      </span>
    </div>
  );
}

function ManualCheckbox({ confirmed, onConfirm }: { confirmed: boolean; onConfirm: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={confirmed}
        onChange={onConfirm}
        className="h-4 w-4 rounded border-surface-border text-brand-500 focus:ring-brand-300"
      />
      I&apos;ve added the code — ready for admin review
    </label>
  );
}
