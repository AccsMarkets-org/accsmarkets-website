import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { Permission } from "@/lib/permissions";

/** Returns the admin session or null. Every /api/admin route must call this first.
 *  Optionally pass a permission (or array) to enforce granular RBAC.
 *  Users with ADMIN role but no staffRoleId get full access (owner). */
export async function requireAdmin(permission?: Permission | Permission[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;

  if (!permission) return session;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { staffRole: true },
  });

  if (!user) return null;
  if (!user.staffRoleId) return session;

  const userPerms: string[] = (user.staffRole?.permissions as string[]) ?? [];
  const required = Array.isArray(permission) ? permission : [permission];
  const hasAll = required.every((p) => userPerms.includes(p));

  return hasAll ? session : null;
}

/** Check if a specific user has a permission. Used in non-session contexts. */
export async function checkPermission(userId: string, permission: Permission): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { staffRole: true },
  });
  if (!user || user.role !== "ADMIN") return false;
  if (!user.staffRoleId) return true;
  const perms = (user.staffRole?.permissions as string[]) ?? [];
  return perms.includes(permission);
}

/** Writes an audit row. Call inside the same transaction as the mutation when possible. */
export function auditLog(
  tx: Prisma.TransactionClient | typeof prisma,
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>,
) {
  return tx.adminAuditLog.create({
    data: { adminId, action, targetType, targetId, metadata: metadata as Prisma.InputJsonValue },
  });
}
