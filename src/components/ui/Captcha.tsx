"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    hcaptcha?: {
      render: (
        container: HTMLElement,
        opts: { sitekey: string; callback: (token: string) => void; "expired-callback"?: () => void },
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

export function Captcha({ onVerify }: { onVerify: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return; // dev without keys configured yet — form falls back to a dev bypass token

    const scriptId = "hcaptcha-script";
    function render() {
      if (containerRef.current && window.hcaptcha && widgetId.current === null) {
        widgetId.current = window.hcaptcha.render(containerRef.current, {
          sitekey: SITE_KEY!,
          callback: onVerify,
          "expired-callback": () => onVerify(""),
        });
      }
    }

    if (window.hcaptcha) {
      render();
    } else if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://js.hcaptcha.com/1/api.js";
      script.async = true;
      script.onload = render;
      document.body.appendChild(script);
    } else {
      document.getElementById(scriptId)?.addEventListener("load", render);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!SITE_KEY) {
    return (
      <button
        type="button"
        onClick={() => onVerify("dev-bypass-token")}
        className="rounded-xl border border-dashed border-surface-border px-3 py-2 text-xs text-muted"
      >
        Captcha not configured — click to simulate verification (dev only)
      </button>
    );
  }

  return <div ref={containerRef} />;
}
