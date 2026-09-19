import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

function adminGuard() {
  return getServerSession(authOptions).then((s) => {
    if (!s?.user || (s.user as { role?: string }).role !== "ADMIN") return null;
    return s;
  });
}

// GET — current admin profile + connected accounts
export async function GET() {
  const session = await adminGuard();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, username: true,
      image: true, bio: true, createdAt: true, updatedAt: true,
      accounts: { select: { provider: true, providerAccountId: true } },
      activeSessions: {
        orderBy: { lastSeenAt: "desc" },
        take: 10,
        select: { id: true, userAgent: true, ip: true, lastSeenAt: true, createdAt: true },
      },
    },
  });

  return NextResponse.json(user);
}

// PUT — update profile or change password
const profileSchema = z.object({
  action: z.enum(["profile", "password"]),
  // profile
  name: z.string().min(1).max(100).optional(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
  bio: z.string().max(300).optional(),
  image: z.string().url().optional().or(z.literal("")),
  // password
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

export async function PUT(req: NextRequest) {
  const session = await adminGuard();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { action } = parsed.data;

  if (action === "profile") {
    const { name, username, bio, image } = parsed.data;

    if (username) {
      const existing = await prisma.user.findFirst({ where: { username, NOT: { id: session.user.id } } });
      if (existing) return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(username !== undefined && { username }),
        ...(bio !== undefined && { bio }),
        ...(image !== undefined && { image: image || null }),
      },
      select: { id: true, name: true, username: true, bio: true, image: true },
    });

    return NextResponse.json({ ok: true, user: updated });
  }

  if (action === "password") {
    const { currentPassword, newPassword } = parsed.data;
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Both passwords required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } });
    if (!user?.password) return NextResponse.json({ error: "No password set on this account" }, { status: 400 });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: session.user.id }, data: { password: hash } });

    await prisma.adminAuditLog.create({
      data: {
        adminId: session.user.id,
        action: "ADMIN_PASSWORD_CHANGED",
        targetType: "USER",
        targetId: session.user.id,
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
