"use client";

import { useTheme, type Theme } from "./ThemeProvider";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      className={`flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${className ?? ""}`}
    >
      {resolvedTheme === "dark" ? (
        <Moon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      ) : (
        <Sun className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}
