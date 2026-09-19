export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrency(amount: number | string): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.round((d.getTime() - Date.now()) / 1000);
  const divisions: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, secondsInUnit] of divisions) {
    if (Math.abs(seconds) >= secondsInUnit || unit === "second") {
      return rtf.format(Math.round(seconds / secondsInUnit), unit);
    }
  }
  return rtf.format(0, "second");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Flag emoji for any ISO 3166-1 alpha-2 country code (e.g. "ML" → 🇲🇱). */
export function countryFlagEmoji(code?: string | null): string {
  if (!code || !/^[a-zA-Z]{2}$/.test(code)) return "🌐";
  const cc = code.toUpperCase();
  const base = 0x1f1e6; // regional indicator symbol "A"
  return String.fromCodePoint(base + cc.charCodeAt(0) - 65, base + cc.charCodeAt(1) - 65);
}

let _regionNames: Intl.DisplayNames | null = null;
/** Full English country name for an ISO code (e.g. "ML" → "Mali"), via Intl. */
export function countryName(code?: string | null): string {
  if (!code) return "Unknown";
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return cc;
  try {
    _regionNames = _regionNames ?? new Intl.DisplayNames(["en"], { type: "region" });
    return _regionNames.of(cc) ?? cc;
  } catch {
    return cc;
  }
}
