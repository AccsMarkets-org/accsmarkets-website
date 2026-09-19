// Multi-currency display layer. Prices are STORED and SETTLED in USD everywhere
// (escrow, wallet, checkout, offers). This module only powers an approximate
// local-currency *display* for browsing, auto-picked from the visitor's country
// (Cloudflare CF-IPCountry). Everything degrades gracefully to USD.

export interface CurrencyMeta {
  symbol: string;
  name: string;
  locale: string;
  decimals: number;
}

// Supported display currencies (all valid ISO-4217 codes for Intl currency formatting).
export const CURRENCIES: Record<string, CurrencyMeta> = {
  USD: { symbol: "$", name: "US Dollar", locale: "en-US", decimals: 2 },
  EUR: { symbol: "€", name: "Euro", locale: "de-DE", decimals: 2 },
  GBP: { symbol: "£", name: "British Pound", locale: "en-GB", decimals: 2 },
  INR: { symbol: "₹", name: "Indian Rupee", locale: "en-IN", decimals: 2 },
  PKR: { symbol: "₨", name: "Pakistani Rupee", locale: "en-PK", decimals: 0 },
  BDT: { symbol: "৳", name: "Bangladeshi Taka", locale: "en-BD", decimals: 0 },
  NGN: { symbol: "₦", name: "Nigerian Naira", locale: "en-NG", decimals: 0 },
  BRL: { symbol: "R$", name: "Brazilian Real", locale: "pt-BR", decimals: 2 },
  RUB: { symbol: "₽", name: "Russian Ruble", locale: "ru-RU", decimals: 0 },
  PHP: { symbol: "₱", name: "Philippine Peso", locale: "en-PH", decimals: 2 },
  IDR: { symbol: "Rp", name: "Indonesian Rupiah", locale: "id-ID", decimals: 0 },
  TRY: { symbol: "₺", name: "Turkish Lira", locale: "tr-TR", decimals: 2 },
  EGP: { symbol: "E£", name: "Egyptian Pound", locale: "en-EG", decimals: 2 },
  VND: { symbol: "₫", name: "Vietnamese Dong", locale: "vi-VN", decimals: 0 },
  CAD: { symbol: "C$", name: "Canadian Dollar", locale: "en-CA", decimals: 2 },
  AUD: { symbol: "A$", name: "Australian Dollar", locale: "en-AU", decimals: 2 },
  AED: { symbol: "د.إ", name: "UAE Dirham", locale: "en-AE", decimals: 2 },
  SAR: { symbol: "﷼", name: "Saudi Riyal", locale: "en-SA", decimals: 2 },
  MYR: { symbol: "RM", name: "Malaysian Ringgit", locale: "ms-MY", decimals: 2 },
  THB: { symbol: "฿", name: "Thai Baht", locale: "th-TH", decimals: 2 },
  MXN: { symbol: "MX$", name: "Mexican Peso", locale: "es-MX", decimals: 2 },
  ZAR: { symbol: "R", name: "South African Rand", locale: "en-ZA", decimals: 2 },
  UAH: { symbol: "₴", name: "Ukrainian Hryvnia", locale: "uk-UA", decimals: 0 },
  KES: { symbol: "KSh", name: "Kenyan Shilling", locale: "en-KE", decimals: 0 },
  JPY: { symbol: "¥", name: "Japanese Yen", locale: "ja-JP", decimals: 0 },
  CNY: { symbol: "¥", name: "Chinese Yuan", locale: "zh-CN", decimals: 2 },
  SGD: { symbol: "S$", name: "Singapore Dollar", locale: "en-SG", decimals: 2 },
  PLN: { symbol: "zł", name: "Polish Złoty", locale: "pl-PL", decimals: 2 },
};

// ISO-3166 alpha-2 country → display currency.
export const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD",
  GB: "GBP",
  IN: "INR",
  PK: "PKR",
  BD: "BDT",
  NG: "NGN",
  BR: "BRL",
  RU: "RUB",
  PH: "PHP",
  ID: "IDR",
  TR: "TRY",
  EG: "EGP",
  VN: "VND",
  CA: "CAD",
  AU: "AUD",
  AE: "AED",
  SA: "SAR",
  MY: "MYR",
  TH: "THB",
  MX: "MXN",
  ZA: "ZAR",
  UA: "UAH",
  KE: "KES",
  JP: "JPY",
  CN: "CNY",
  SG: "SGD",
  PL: "PLN",
  NZ: "AUD",
  // Eurozone
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR", AT: "EUR",
  IE: "EUR", PT: "EUR", GR: "EUR", FI: "EUR", SK: "EUR", SI: "EUR", LT: "EUR",
  LV: "EUR", EE: "EUR", LU: "EUR", CY: "EUR", MT: "EUR", HR: "EUR",
};

// Approximate USD-based fallback rates. Only used if the live rates API is
// unreachable, so display is never absurd. Live rates override these.
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.3, PKR: 278, BDT: 118, NGN: 1550,
  BRL: 5.4, RUB: 92, PHP: 57, IDR: 16200, TRY: 33, EGP: 48, VND: 25400,
  CAD: 1.37, AUD: 1.52, AED: 3.67, SAR: 3.75, MYR: 4.7, THB: 36, MXN: 18.5,
  ZAR: 18.7, UAH: 41, KES: 129, JPY: 157, CNY: 7.2, SGD: 1.35, PLN: 3.95,
};

export const DEFAULT_CURRENCY = "USD";

export function currencyForCountry(cc?: string | null): string {
  if (!cc) return DEFAULT_CURRENCY;
  return COUNTRY_CURRENCY[cc.toUpperCase()] ?? DEFAULT_CURRENCY;
}

export function convertFromUsd(usd: number, code: string, rates: Record<string, number>): number {
  const rate = rates[code] ?? FALLBACK_RATES[code] ?? 1;
  return usd * rate;
}

/**
 * Format an amount already in `code`'s units. Amounts ≥ 100 are shown without
 * minor units for a cleaner "approximate" look, since these are estimates.
 */
export function formatMoney(amount: number, code: string): string {
  const meta = CURRENCIES[code] ?? CURRENCIES.USD;
  const decimals = amount >= 100 ? 0 : meta.decimals;
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    // Unknown locale/currency in this runtime — fall back to symbol + number.
    return `${meta.symbol}${amount.toLocaleString("en-US", { maximumFractionDigits: decimals })}`;
  }
}

export interface RatesPayload {
  currency: string;
  base: "USD";
  rates: Record<string, number>;
  updatedAt: string;
}
