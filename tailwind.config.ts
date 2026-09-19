import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "hsl(var(--brand-50) / <alpha-value>)",
          100: "hsl(var(--brand-100) / <alpha-value>)",
          200: "hsl(var(--brand-200) / <alpha-value>)",
          300: "hsl(var(--brand-300) / <alpha-value>)",
          400: "hsl(var(--brand-400) / <alpha-value>)",
          500: "hsl(var(--brand-500) / <alpha-value>)",
          600: "hsl(var(--brand-600) / <alpha-value>)",
          700: "hsl(var(--brand-700) / <alpha-value>)",
          800: "hsl(var(--brand-800) / <alpha-value>)",
          900: "hsl(var(--brand-900) / <alpha-value>)",
          950: "hsl(var(--brand-950) / <alpha-value>)",
        },
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        "surface-border": "hsl(var(--surface-border) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        success: "hsl(var(--success) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
        info: "hsl(var(--info) / <alpha-value>)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 6px -1px rgb(0 0 0 / 0.05)",
      },
      typography: {
        DEFAULT: {
          css: {
            // Wired to the app's own CSS variables (not a separate palette) so
            // articles automatically follow light/dark mode like everything else.
            "--tw-prose-body": "hsl(var(--foreground) / 0.9)",
            "--tw-prose-headings": "hsl(var(--foreground))",
            "--tw-prose-lead": "hsl(var(--muted))",
            "--tw-prose-links": "hsl(var(--brand-600))",
            "--tw-prose-bold": "hsl(var(--foreground))",
            "--tw-prose-counters": "hsl(var(--muted))",
            "--tw-prose-bullets": "hsl(var(--brand-400))",
            "--tw-prose-hr": "hsl(var(--surface-border))",
            "--tw-prose-quotes": "hsl(var(--foreground))",
            "--tw-prose-quote-borders": "hsl(var(--brand-300))",
            "--tw-prose-captions": "hsl(var(--muted))",
            "--tw-prose-code": "hsl(var(--foreground))",
            "--tw-prose-th-borders": "hsl(var(--surface-border))",
            "--tw-prose-td-borders": "hsl(var(--surface-border))",
            maxWidth: "none",
            a: { textDecoration: "none", fontWeight: "600" },
            "a:hover": { textDecoration: "underline" },
            "h2, h3": { fontWeight: "700", letterSpacing: "-0.01em" },
            "code::before": { content: "none" },
            "code::after": { content: "none" },
            code: {
              backgroundColor: "hsl(var(--surface))",
              border: "1px solid hsl(var(--surface-border))",
              borderRadius: "0.375rem",
              padding: "0.15em 0.4em",
              fontWeight: "500",
            },
            img: { borderRadius: "0.75rem" },
          },
        },
      },
      keyframes: {
        shimmer: {
          "0%, 100%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(300%)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
