"use client";

import { useState, useCallback, useRef } from "react";

interface PromptOptions {
  title: string;
  placeholder?: string;
  type?: "text" | "number";
}

export function usePrompt() {
  const [opts, setOpts] = useState<PromptOptions | null>(null);
  const [value, setValue] = useState("");
  const resolveRef = useRef<((v: string | null) => void) | null>(null);

  const promptInput = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise((res) => {
      resolveRef.current = res;
      setValue("");
      setOpts(options);
    });
  }, []);

  function handleConfirm() {
    resolveRef.current?.(value.trim() || null);
    resolveRef.current = null;
    setOpts(null);
  }

  function handleCancel() {
    resolveRef.current?.(null);
    resolveRef.current = null;
    setOpts(null);
  }

  const PromptDialog = opts ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-surface p-6 shadow-2xl">
        <h2 className="text-base font-semibold text-foreground">{opts.title}</h2>
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          type={opts.type ?? "text"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
            if (e.key === "Escape") handleCancel();
          }}
          placeholder={opts.placeholder}
          className="mt-3 h-10 w-full rounded-xl border border-surface-border bg-background px-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
        />
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium text-foreground hover:bg-brand-500/8 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { promptInput, PromptDialog };
}
