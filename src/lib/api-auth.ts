import { createHash } from "crypto";
import { prisma } from "@/lib/db";

interface ApiKeyContext {
  userId: string;
  scopes: string[];
}

export async function authenticateApiKey(
  authHeader: string | null,
): Promise<ApiKeyContext | null> {
  if (!authHeader?.startsWith("Bearer am_")) return null;
  const raw = authHeader.slice(7); // strip "Bearer "
  const keyHash = createHash("sha256").update(raw).digest("hex");

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { userId: true, scopes: true, revokedAt: true, expiresAt: true, id: true },
  });

  if (!apiKey) return null;
  if (apiKey.revokedAt) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Fire-and-forget lastUsedAt update
  prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return { userId: apiKey.userId, scopes: apiKey.scopes.split(",") };
}
