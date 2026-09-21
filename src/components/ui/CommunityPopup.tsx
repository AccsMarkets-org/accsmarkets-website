"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "community_popup_dismissed_v1";
const COOKIE_CONSENT_KEY = "cookie_consent_v1";
const DELAY_MS = 30000;

const COMMUNITIES = [
  {
    name: "Telegram",
    desc: "Join our Telegram channel for instant updates & deals",
    href: "https://t.me/accsmarkets",
    color: "#229ED9",
    hoverColor: "#1a8abf",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 14.862l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.697z"/>
      </svg>
    ),
  },
  {
    name: "Facebook",
    desc: "Follow our Facebook page for news & community",
    href: "https://www.facebook.com/accsmarkets/",
    color: "#1877F2",
    hoverColor: "#1560cc",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
      </svg>
    ),
  },
  {
    name: "WhatsApp",
    desc: "Join our WhatsApp community for support & offers",
    href: "https://chat.whatsapp.com/FF635yUd2h96aeY7uDX5Lp",
    color: "#25D366",
    hoverColor: "#1db34f",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
];

export function CommunityPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch { /* ignore */ }

    // Never stack on top of the cookie banner: wait until the visitor has answered it.
    let shown: ReturnType<typeof setTimeout> | undefined;
    const poll = setInterval(() => {
      let answered = true;
      try { answered = Boolean(localStorage.getItem(COOKIE_CONSENT_KEY)); } catch { /* ignore */ }
      if (!answered) return;
      clearInterval(poll);
      shown = setTimeout(() => setVisible(true), DELAY_MS);
    }, 2000);
    return () => {
      clearInterval(poll);
      if (shown) clearTimeout(shown);
    };
  }, []);

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={dismiss}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Join our community"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-surface-border bg-background shadow-2xl"
      >
        {/* Header */}
        <div className="relative rounded-t-2xl bg-gradient-to-br from-brand-500 to-brand-600 px-6 py-6 text-white">
          <button
            onClick={dismiss}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            <h2 className="text-lg font-bold">Join the AccsMarkets Community</h2>
          </div>
          <p className="text-sm text-white/80">
            Get exclusive deals, real-time updates, and connect with thousands of buyers & sellers.
          </p>
        </div>

        {/* Community buttons */}
        <div className="flex flex-col gap-3 p-5">
          {COMMUNITIES.map((c) => (
            <a
              key={c.name}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismiss}
              className="flex items-center gap-4 rounded-xl px-4 py-3.5 text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: c.color }}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
                {c.icon}
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold">{c.name}</p>
                <p className="text-xs text-white/80">{c.desc}</p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 shrink-0 text-white/70">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-surface-border px-5 py-3">
          <button
            onClick={dismiss}
            className="w-full rounded-xl py-2 text-sm text-muted transition hover:text-foreground"
          >
            Maybe later
          </button>
        </div>
      </div>
    </>
  );
}
