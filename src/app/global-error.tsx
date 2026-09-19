"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    try {
      fetch("/api/client-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          digest: error.digest,
          url: window.location.href,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // reporting must never throw
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "24px", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Something went wrong</h2>
          <p style={{ color: "#666", margin: 0, fontSize: "14px" }}>A critical error occurred. Please reload the page.</p>
          <button
            onClick={reset}
            style={{ background: "#f97316", color: "white", border: "none", borderRadius: "12px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
