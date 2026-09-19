import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { adminNotifyTemplate } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  sendEmail: z.boolean().default(false),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await requireAdmin("MANAGE_USERS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await createNotification({
    userId: user.id,
    type: "SYSTEM",
    title: parsed.data.title,
    body: parsed.data.body,
  });

  if (parsed.data.sendEmail) {
    const tpl = adminNotifyTemplate(user.name ?? user.username ?? "there", parsed.data.title, parsed.data.body);
    await sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html });
  }

  return NextResponse.json({ ok: true });
}
