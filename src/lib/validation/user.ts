import { z } from "zod";

const socialLinksSchema = z.object({
  twitter:   z.string().url().optional().or(z.literal("")),
  instagram: z.string().url().optional().or(z.literal("")),
  youtube:   z.string().url().optional().or(z.literal("")),
  website:   z.string().url().optional().or(z.literal("")),
}).optional();

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores"),
  bio:         z.string().trim().max(300).optional(),
  socialLinks: socialLinksSchema,
  image:       z.string().url().optional().nullable(),
  coverPhoto:  z.string().url().optional().nullable(),
  countryCode: z.string().min(2).max(8).optional().nullable(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
