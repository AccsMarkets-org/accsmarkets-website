"use client";

import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  activeColor?: string;
}

export function Toggle({ checked, onChange, disabled, activeColor }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 cursor-pointer rounded-full p-0 transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
        checked ? (activeColor ?? "bg-brand-500") : "bg-surface-border",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
