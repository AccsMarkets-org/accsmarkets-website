"use client";

import { cn } from "@/lib/utils";

/**
 * Bold gradient CTA shared by every wallet deposit/withdraw surface (Add
 * Funds' method tabs, the card form, checkout's card top-up) — one button
 * style instead of each surface rolling its own, so a users going from e.g.
 * the Apple Pay button straight into the card form below it doesn't land on
 * a visibly weaker, differently-styled "Pay" button.
 */
export function PrimaryButton({
  children,
  isLoading,
  disabled,
  type = "button",
  onClick,
  className,
}: {
  children: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-black transition",
        !disabled && !isLoading
          ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:scale-[1.01]"
          : "cursor-not-allowed bg-surface text-muted",
        className,
      )}
    >
      {isLoading ? (
        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        children
      )}
    </button>
  );
}
