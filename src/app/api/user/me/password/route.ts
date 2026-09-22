import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions, reissueSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { passwordChangedTemplate } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true, email: true, name: true },
  });
  if (!user?.password) {
    return NextResponse.json({ error: "Password change is not available for OAuth accounts" }, { status: 400 });
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
  // Bumping tokenVersion signs out every other device; the caller's own cookie
  // is re-minted below with the new version so this device stays logged in.
  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed, tokenVersion: { increment: 1 } },
    select: { tokenVersion: true },
  });

  if (user.email) {
    const tpl = passwordChangedTemplate(user.name ?? "there");
    sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html }).catch(() => null);
  }

  const res = NextResponse.json({ ok: true });
  await reissueSessionCookie(req, res, updated.tokenVersion);
  return res;
}
