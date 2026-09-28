import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(300),
  html: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_MARKETING");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  try {
    await sendEmail({
      to: parsed.data.to,
      subject: `[TEST] ${parsed.data.subject}`,
      html: parsed.data.html,
    });
  } catch {
    return NextResponse.json({ error: "SMTP send failed — check server email configuration" }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
