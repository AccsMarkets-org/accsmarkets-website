import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validation/user";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let user;
  try {
    user = await prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      include: {
        subscriptionPlan: true,
        twoFactorAuth: { select: { enabledAt: true } },
        phoneVerification: { select: { phoneNumber: true, verifiedAt: true } },
      },
    });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
  const { password: _pw, twoFactorAuth, phoneVerification, ...safeUser } = user;
  return NextResponse.json({
    user: {
      ...safeUser,
      twoFactorEnabled: Boolean(twoFactorAuth),
      phoneVerified: Boolean(phoneVerification?.verifiedAt),
      verifiedPhoneNumber: phoneVerification?.verifiedAt ? phoneVerification.phoneNumber : null,
    },
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const usernameTaken = await prisma.user.findFirst({
    where: { username: parsed.data.username, NOT: { id: session.user.id } },
  });
  if (usernameTaken) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
  });

  const { password: _pw, ...safeUser } = user;
  return NextResponse.json({ user: safeUser });
}
