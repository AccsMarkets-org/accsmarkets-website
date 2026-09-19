import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { contactAutoReplyTemplate } from "@/lib/email-templates";
import { prisma } from "@/lib/db";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email(),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(3000),
});

export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  const { allowed } = await checkRateLimit(`contact:${ip}`, 3, 60 * 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many messages. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { name, email, subject, message } = parsed.data;

  await prisma.contactMessage.create({
    data: { name, email, subject, message, ip },
  });

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: `[Contact] ${subject}`,
      html: `<p><strong>From:</strong> ${name} (${email})</p><p>${message.replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>`,
    });
  }

  // Auto-reply
  const tpl = contactAutoReplyTemplate(name, subject);
  await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });

  return NextResponse.json({ success: true });
}
