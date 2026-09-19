import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, auditLog } from "@/lib/admin";
import { z } from "zod";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";

export const dynamic = "force-dynamic";

const maintenanceSchema = z.object({
  maintenanceMode: z.boolean(),
  maintenanceTitle: z.string().max(100).nullable().optional(),
  maintenanceMessage: z.string().max(500).nullable().optional(),
  maintenanceEndTime: z.string().nullable().optional(),
  maintenanceAllowAdmins: z.boolean().optional(),
});

function syncEnvVar(enabled: boolean) {
  try {
    const envPath = join(process.cwd(), ".env");
    let content = readFileSync(envPath, "utf-8");
    const newVal = `MAINTENANCE_MODE="${enabled ? "true" : "false"}"`;
    if (/^MAINTENANCE_MODE=/m.test(content)) {
      content = content.replace(/^MAINTENANCE_MODE=.*/m, newVal);
    } else {
      content = `${newVal}\n${content}`;
    }
    writeFileSync(envPath, content, "utf-8");

    // Reload PM2 in the background so the middleware picks up the new env var.
    // Detached + unref so the response is sent before/during the reload.
    const child = spawn("pm2", ["reload", "accsmarkets", "--update-env"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
  } catch {
    // Non-fatal — DB is updated; admin can manually restart if needed.
  }
}

export async function PUT(req: Request) {
  const session = await requireAdmin("MANAGE_SETTINGS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = maintenanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  }

  const { maintenanceMode, maintenanceTitle, maintenanceMessage, maintenanceEndTime, maintenanceAllowAdmins } = parsed.data;

  const settings = await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    create: {
      maintenanceMode,
      maintenanceTitle,
      maintenanceMessage,
      maintenanceEndTime: maintenanceEndTime ? new Date(maintenanceEndTime) : null,
      maintenanceAllowAdmins: maintenanceAllowAdmins ?? true,
    },
    update: {
      maintenanceMode,
      maintenanceTitle,
      maintenanceMessage,
      maintenanceEndTime: maintenanceEndTime ? new Date(maintenanceEndTime) : null,
      maintenanceAllowAdmins: maintenanceAllowAdmins ?? true,
    },
  });

  await auditLog(
    prisma,
    session.user.id,
    maintenanceMode ? "enable_maintenance_mode" : "disable_maintenance_mode",
    "PlatformSettings",
    "singleton",
    { maintenanceTitle, maintenanceEndTime }
  );

  // Sync env var + reload PM2 so the middleware picks up the change immediately.
  syncEnvVar(maintenanceMode);

  return NextResponse.json({ settings });
}

export async function GET() {
  const session = await requireAdmin("MANAGE_SETTINGS");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await prisma.platformSettings.findUnique({
    where: { id: "singleton" },
    select: {
      maintenanceMode: true,
      maintenanceTitle: true,
      maintenanceMessage: true,
      maintenanceEndTime: true,
      maintenanceAllowAdmins: true,
    },
  });

  return NextResponse.json({ settings });
}
