// Platforms verified automatically via server-side API — no manual bypass allowed
export const TOKEN_REQUIRED_PLATFORMS = new Set([
  "YOUTUBE",   // YouTube Data API v3
  "TELEGRAM",  // Telegram Bot API
]);

// Platforms where admin reviews the code manually during listing review
export const MANUAL_PLATFORMS = new Set([
  "INSTAGRAM",
  "TIKTOK",
  "TWITTER_X",
  "FACEBOOK",
  "SNAPCHAT",
  "PINTEREST",
  "LINKEDIN",
  "WEBSITE",
]);

export function platformRequiresToken(platform: string): boolean {
  return TOKEN_REQUIRED_PLATFORMS.has(platform);
}
