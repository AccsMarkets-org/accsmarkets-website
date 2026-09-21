// Utilities for checking whether a user has completed the minimum required
// profile fields. Used by the ProfileCompletionBanner and server-side checks.

export function isProfileComplete(user: {
  name: string | null;
  username: string | null;
  email: string;
  emailVerified: Date | null;
}): boolean {
  return Boolean(user.name && user.username && user.emailVerified);
}

export function getMissingProfileFields(user: {
  name: string | null;
  username: string | null;
  email: string;
  emailVerified: Date | null;
}): string[] {
  const missing: string[] = [];
  if (!user.name) missing.push("full name");
  if (!user.username) missing.push("username");
  if (!user.emailVerified) missing.push("email verification");
  return missing;
}
