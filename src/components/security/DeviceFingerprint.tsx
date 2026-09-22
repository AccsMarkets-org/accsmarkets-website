"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

const SENT_KEY = "accsmarkets-fp-sent";

/**
 * Stable, dependency-free device fingerprint: SHA-256 of a handful of browser
 * signals. Coarse on purpose — it's a multi-account heuristic for the risk
 * engine, not identification. Returns null when SubtleCrypto is unavailable
 * (non-secure context) so callers can simply skip it.
 */
export async function computeDeviceFingerprint(): Promise<string | null> {
  try {
    if (typeof window === "undefined" || !window.crypto?.subtle) return null;
    const nav = window.navigator;
    const parts = [
      nav.userAgent,
      nav.language,
      `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
      nav.platform ?? "",
      String(nav.hardwareConcurrency ?? ""),
    ];
    const bytes = new TextEncoder().encode(parts.join("|"));
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

/**
 * Mounted once in the root layout (inside SessionProvider). After the user is
 * authenticated it posts the fingerprint to /api/auth/sessions once per
 * browser session, which records the DeviceFingerprint row and re-scores risk.
 * Renders nothing.
 */
export function DeviceFingerprint() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    try {
      if (sessionStorage.getItem(SENT_KEY)) return;
    } catch {
      // sessionStorage unavailable — fall through and send once per mount.
    }

    let cancelled = false;
    (async () => {
      const fingerprintHash = await computeDeviceFingerprint();
      if (cancelled) return;
      try {
        await fetch("/api/auth/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fingerprintHash ? { fingerprintHash } : {}),
        });
        try {
          sessionStorage.setItem(SENT_KEY, "1");
        } catch {
          // ignore
        }
      } catch {
        // best-effort — never surface to the user
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  return null;
}
