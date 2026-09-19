export const SUPPORTED_LOCALES = ["en", "es"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "en";

export function resolveLocale(acceptLanguage?: string | null): SupportedLocale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const preferred = acceptLanguage
    .split(",")
    .map((s) => s.split(";")[0].trim().slice(0, 2).toLowerCase());
  for (const lang of preferred) {
    if ((SUPPORTED_LOCALES as readonly string[]).includes(lang)) {
      return lang as SupportedLocale;
    }
  }
  return DEFAULT_LOCALE;
}
