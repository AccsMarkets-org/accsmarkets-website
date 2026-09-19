"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { IosInstallModal } from "./IosInstallModal";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  return (
    isIos() &&
    /Safari/i.test(navigator.userAgent) &&
    !/CriOS|FxiOS|OPiOS/i.test(navigator.userAgent)
  );
}

async function subscribeToPush() {
  try {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey || !("PushManager" in window)) return;

    const sw = await navigator.serviceWorker.ready;
    const existing = await sw.pushManager.getSubscription();
    if (existing) return;

    const sub = await sw.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });

    const { endpoint, keys } = sub.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    // Payload shape must match /api/push/subscribe's schema exactly: a
    // nested `keys` object (matching PushSubscriptionJSON), not flat
    // p256dh/auth fields — every subscribe attempt was silently failing
    // Zod validation (400) before this fix, since subscribeToPush's catch
    // block swallows the error with no user-visible feedback.
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }),
    });

    localStorage.setItem("accsmarkets-push-subscribed", "1");
  } catch {
    // push subscription failed — no-op
  }
}

export function PwaInit() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;
  const [showIosModal, setShowIosModal] = useState(false);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Admin (/admin/*) and the consumer site are two separately-installable apps
  // (different manifest, start_url, and icon name) — dismissing one prompt
  // shouldn't silently suppress the other, so each gets its own storage key.
  const installDismissedKey = `accsmarkets-install-dismissed-${isAdminRoute ? "admin" : "main"}`;

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const installDismissed = localStorage.getItem(installDismissedKey);
    const standalone = isInStandaloneMode();

    if (!standalone && !installDismissed) {
      if (isIosSafari()) {
        // Delay to not interrupt first paint
        const t = setTimeout(() => setShowIosModal(true), 3000);
        return () => clearTimeout(t);
      } else {
        // Android / Chrome — listen for beforeinstallprompt
        const handler = (e: Event) => {
          e.preventDefault();
          setDeferredPrompt(e as BeforeInstallPromptEvent);
          setShowAndroidBanner(true);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
      }
    }

    if (standalone && session?.user?.id) {
      const pushSubscribed = localStorage.getItem("accsmarkets-push-subscribed");
      const pushDismissed = localStorage.getItem("accsmarkets-push-dismissed");
      if (!pushSubscribed && !pushDismissed && "Notification" in window && Notification.permission === "default") {
        const t = setTimeout(() => setShowPushBanner(true), 2000);
        return () => clearTimeout(t);
      }
    }
  }, [session?.user?.id, installDismissedKey]);

  function dismissInstall() {
    localStorage.setItem(installDismissedKey, "1");
    setShowIosModal(false);
    setShowAndroidBanner(false);
  }

  async function androidInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(installDismissedKey, "1");
      setShowAndroidBanner(false);
    }
    setDeferredPrompt(null);
  }

  async function enablePush() {
    const permission = await Notification.requestPermission();
    if (permission === "granted" && session?.user?.id) {
      await subscribeToPush();
    }
    setShowPushBanner(false);
  }

  function dismissPush() {
    localStorage.setItem("accsmarkets-push-dismissed", "1");
    setShowPushBanner(false);
  }

  const bannerStyle = {
    bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.5rem)",
  } as React.CSSProperties;

  return (
    <>
      {/* iOS install bottom sheet */}
      {showIosModal && (
        <IosInstallModal onDismiss={dismissInstall} appName={isAdminRoute ? "AccsMarkets Admin" : "AccsMarkets"} />
      )}

      {/* Android install banner */}
      {showAndroidBanner && (
        <div
          className="fixed left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-surface-border bg-surface px-4 py-3 shadow-xl"
          style={bannerStyle}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📲</span>
            <div>
              <p className="text-sm font-semibold text-foreground">Add to home screen</p>
              <p className="text-xs text-muted">
                Quick access to {isAdminRoute ? "the AccsMarkets admin console" : "AccsMarkets"}.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={androidInstall}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
            >
              Install
            </button>
            <button
              onClick={dismissInstall}
              aria-label="Dismiss"
              className="rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-brand-500/8"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Push notification opt-in banner */}
      {showPushBanner && (
        <div
          className="fixed left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-surface-border bg-surface px-4 py-3 shadow-xl"
          style={bannerStyle}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="text-sm font-semibold text-foreground">Enable notifications</p>
              <p className="text-xs text-muted">Get alerts for offers and messages.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={enablePush}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
            >
              Enable
            </button>
            <button
              onClick={dismissPush}
              aria-label="Dismiss"
              className="rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-brand-500/8"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
