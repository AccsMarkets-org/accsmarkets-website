"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

// Pings /api/presence every 60s to keep lastSeenAt current while the user is active.
export function usePresence() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    function ping() {
      fetch("/api/presence", { method: "POST" }).catch(() => null);
    }

    ping(); // immediate on mount
    const id = setInterval(ping, 60_000);

    // Also ping when tab regains focus
    const onVisible = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status]);
}
