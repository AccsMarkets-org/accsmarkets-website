import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { staffInviteTemplate } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const inviteSchema = z.object({
  email: z.string().email(),
  staffRoleId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_STAFF");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const { email, staffRoleId } = parsed.data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    if (existingUser.role === "ADMIN") {
      return NextResponse.json({ error: "This user is already an admin" }, { status: 409 });
    }
    // Promote existing user directly
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { role: "ADMIN", staffRoleId: staffRoleId ?? null },
    });
    await auditLog(prisma, session.user.id, "promote_to_admin", "User", existingUser.id, { staffRoleId, viaInvite: true });
    return NextResponse.json({ ok: true, promoted: true });
  }

  // Check if there's a pending invite
  const existingInvite = await prisma.staffInvite.findUnique({ where: { email } });
  if (existingInvite) {
    // Update the existing invite
    await prisma.staffInvite.update({
      where: { email },
      data: { staffRoleId: staffRoleId ?? null, invitedById: session.user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
  } else {
    // Create new invite
    await prisma.staffInvite.create({
      data: {
        email,
        staffRoleId: staffRoleId ?? null,
        invitedById: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  }

  // Get role name for email
  let roleName = "Owner (Full Access)";
  if (staffRoleId) {
    const role = await prisma.staffRole.findUnique({ where: { id: staffRoleId } });
    if (role) roleName = role.name;
  }

  // Send invite email
  const inviterName = session.user.name ?? session.user.email;
  const signupUrl = `${process.env.NEXTAUTH_URL}/register?staff_invite=${encodeURIComponent(email)}`;

  const tpl = staffInviteTemplate(inviterName ?? "AccsMarkets", roleName, signupUrl);
  await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });

  await auditLog(prisma, session.user.id, "send_staff_invite", "StaffInvite", email, { staffRoleId, roleName });

  return NextResponse.json({ ok: true });
}
