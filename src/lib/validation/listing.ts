import { z } from "zod";

// Detects URLs and phone numbers that sellers must not put in descriptions
const CONTACT_URL_RE = /https?:\/\/\S+|www\.\S+|[a-zA-Z0-9][-a-zA-Z0-9]{1,30}\.(?:com|net|org|io|co|me|app|xyz|info|biz|tv|gg|link)\b/i;
const CONTACT_PHONE_RE = /(?:\+?\d[\s\-.]?){7,15}(?!\d)/;

export function containsContactInfo(text: string): boolean {
  return CONTACT_URL_RE.test(text) || CONTACT_PHONE_RE.test(text);
}

export const PLATFORMS = [
  "YOUTUBE",
  "INSTAGRAM",
  "TIKTOK",
  "FACEBOOK",
  "TELEGRAM",
  "TWITTER_X",
  "SNAPCHAT",
  "PINTEREST",
  "LINKEDIN",
  "WEBSITE",
] as const;

export const createListingSchema = z.object({
  platform: z.enum(PLATFORMS),
  accountUrl: z.string().trim().url("Enter a valid URL"),
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(1000)
    .refine((v) => !containsContactInfo(v), {
      message: "Description must not contain links or phone numbers. Share contact info through the platform's secure messaging instead.",
    }),
  price: z.number().min(1),
  followers: z.number().int().min(0).optional(),
  engagementRate: z.number().min(0).max(100).optional(),
  accountAgeMonths: z.number().int().min(0).optional(),
  monetized: z.boolean().optional(),
  screenshots: z.array(z.string().url()).max(10).default([]),
  logoUrl: z.string().url().nullable().optional(),
  // Channel Analytics (Area 2)
  lifetimeViews: z.number().int().min(0).optional(),
  lifetimeRevenue: z.number().min(0).optional(),
  channelRpm: z.number().min(0).optional(),
  audienceLanguage: z.string().max(60).optional(),
  channelCreationDate: z.string().optional(),
  strikeCount: z.number().int().min(0).optional(),
  warningCount: z.number().int().min(0).optional(),
  strikeWarningContext: z.string().max(300).optional(),
  adsenseStatus: z.enum(["ON", "OFF", "CHANGEABLE"]).optional(),
  niche: z.string().max(60).nullable().optional(),
  displayName: z.string().trim().min(1).max(100).optional(),
  ownershipVerificationCode: z.string().min(1).optional(),
  ownershipVerified: z.boolean().optional(),
  ownershipToken: z.string().optional(), // signed token from /api/listings/verify/*
  // M4
  saleType: z.enum(["FIXED", "AUCTION"]).optional(),
  isPrivate: z.boolean().optional(),
  auctionEndsAt: z.string().datetime({ offset: true }).optional(),
  reservePrice: z.number().min(0).optional(),
  buyNowPrice: z.number().min(0).optional(),
  minBidIncrement: z.number().min(0).optional(),
});
export type CreateListingInput = z.infer<typeof createListingSchema>;

export const updateListingSchema = createListingSchema.partial();

export const listingFilterSchema = z.object({
  q: z.string().trim().max(200).optional(),
  platform: z.enum(PLATFORMS).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minFollowers: z.coerce.number().optional(),
  maxFollowers: z.coerce.number().optional(),
  monetized: z.coerce.boolean().optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "followers", "relevance"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
});
