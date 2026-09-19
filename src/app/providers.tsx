"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import { ThemeProvider } from "@/components/ui/ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <CurrencyProvider>{children}</CurrencyProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "hsl(var(--surface))",
              color: "hsl(var(--foreground))",
              border: "1px solid hsl(var(--surface-border))",
            },
            success: { iconTheme: { primary: "hsl(24 95% 53%)", secondary: "white" } },
          }}
        />
      </SessionProvider>
    </ThemeProvider>
  );
}
