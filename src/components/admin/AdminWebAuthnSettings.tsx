"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

interface Credential {
  id: string;
  name: string | null;
  deviceType: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export function AdminWebAuthnSettings() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const load = useCallback(() => {
    fetch("/api/admin/webauthn/credentials")
      .then((r) => r.json())
      .then((d) => setCredentials(d.credentials ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setSupported(browserSupportsWebAuthn());
    load();
  }, [load]);

  async function register() {
    setRegistering(true);
    try {
      const optionsRes = await fetch("/api/admin/webauthn/register/options");
      const options = await optionsRes.json();
      if (!optionsRes.ok) throw new Error(options.error ?? "Failed to start registration");

      const attestation = await startRegistration(options);

      const name =
        typeof window !== "undefined" && /iPhone|iPad/i.test(navigator.userAgent)
          ? "Face ID"
          : /Mac/i.test(navigator.userAgent)
            ? "Touch ID"
            : "This device";

      const verifyRes = await fetch("/api/admin/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: attestation, name }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error ?? "Verification failed");

      toast.success("Face ID enabled for this device.");
      load();
    } catch (err) {
      // Users cancelling the OS prompt throws NotAllowedError — not a real failure.
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (!/NotAllowedError|cancel/i.test(msg)) toast.error(msg);
    } finally {
      setRegistering(false);
    }
  }

  async function remove(id: string) {
    setRemovingId(id);
    try {
      const res = await fetch("/api/admin/webauthn/credentials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to remove");
      setCredentials((prev) => prev.filter((c) => c.id !== id));
      toast.success("Removed.");
    } catch {
      toast.error("Failed to remove device");
    } finally {
      setRemovingId(null);
    }
  }

  if (!supported) return null;

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">Face ID sign-in</h2>
          <p className="mt-0.5 text-sm text-muted">
            Skip the password on this device — sign in with Face ID, Touch ID, or Windows Hello instead.
          </p>
        </div>
        <Button onClick={register} isLoading={registering} size="sm">
          Enable on this device
        </Button>
      </div>

      {!loading && credentials.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2 border-t border-surface-border pt-4">
          {credentials.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-background px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{c.name ?? "Unnamed device"}</p>
                <p className="text-xs text-muted">
                  Added {formatDate(new Date(c.createdAt))}
                  {c.lastUsedAt && <> · last used {formatDate(new Date(c.lastUsedAt))}</>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(c.id)}
                disabled={removingId === c.id}
                className="shrink-0 text-xs font-medium text-danger hover:underline disabled:opacity-50"
              >
                {removingId === c.id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && credentials.length === 0 && (
        <p className="mt-4 border-t border-surface-border pt-4 text-xs text-muted">
          No devices enrolled yet — this browser/device won&apos;t appear at login until you enable it above.
        </p>
      )}
    </div>
  );
}
