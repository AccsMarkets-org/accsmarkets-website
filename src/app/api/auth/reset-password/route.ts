import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validation/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { token, password } = parsed.data;

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || !record.identifier.startsWith("reset:")) {
    return NextResponse.json({ error: "This reset link is invalid or already used." }, { status: 400 });
  }
  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return NextResponse.json({ error: "This reset link has expired." }, { status: 400 });
  }

  const email = record.identifier.replace("reset:", "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "No account found for this link." }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  return NextResponse.json({ success: true });
}
