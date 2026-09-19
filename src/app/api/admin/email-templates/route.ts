import { NextResponse } from "next/server";
import { requireAdmin, auditLog } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  slug: z.string().min(1),
  subject: z.string().min(1).max(300),
  html: z.string().min(1),
});

export async function GET(req: Request) {
  const session = await requireAdmin("MANAGE_SETTINGS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const templates = await prisma.emailTemplate.findMany({ orderBy: { slug: "asc" } });
  return NextResponse.json({ templates });
}

export async function PUT(req: Request) {
  const session = await requireAdmin("MANAGE_SETTINGS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  let template;
  try {
    template = await prisma.emailTemplate.upsert({
      where: { slug: parsed.data.slug },
      create: parsed.data,
      update: { subject: parsed.data.subject, html: parsed.data.html },
    });
  } catch {
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
  }

  // Content that goes out to every user who triggers this template — log the
  // subject/slug (identifying what changed) without bloating the audit log
  // with the full HTML body.
  await auditLog(prisma, session.user.id, "email_template.update", "EmailTemplate", template.id, {
    slug: parsed.data.slug,
    subject: parsed.data.subject,
  });

  return NextResponse.json({ template });
}
