// One-off promotional email blast to the full eligible user base.
// Run manually: npx tsx scripts/send-general-promo.ts
// Not a recurring job — no scheduled task for this one, unlike
// backup-to-drive.ts / marketing-sweep.
//
// Respects User.marketingOptOut and isBanned, and is deduplicated via
// MarketingEmailLog under CAMPAIGN below — safe to re-run; already-sent
// users are skipped, so an interrupted run can just be restarted.
import { readFileSync } from "fs";
import path from "path";

function loadEnvFile(file: string) {
  const text = readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnvFile(path.join(__dirname, "..", ".env"));

// require(), not import, and only AFTER loadEnvFile() above: src/lib/email.ts
// transitively imports src/lib/db.ts, which constructs its PrismaClient
// eagerly at module load — an `import` statement would hoist above
// loadEnvFile() regardless of source order (same as in backup-to-drive.ts),
// but unlike that script's gdrive.ts (which only reads process.env lazily
// inside functions), db.ts's PrismaClient() would then run with
// DATABASE_URL still unset and fail immediately. require() is not hoisted,
// so this order is what actually keeps it working.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { sendEmail } = require("../src/lib/email") as typeof import("../src/lib/email");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { generalPromoTemplate } = require("../src/lib/email-templates") as typeof import("../src/lib/email-templates");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client");

// A separate, local PrismaClient rather than importing the shared
// src/lib/db singleton — sidesteps the load-order hazard above entirely
// for this script's own queries (this is a one-shot CLI run, so none of
// db.ts's dev-hot-reload-singleton concerns apply here anyway).
const prisma = new PrismaClient();

const CAMPAIGN = "general_promo_2026_09_14";
const DELAY_MS = 700; // pace sends — no queue/Redis configured, so this is direct synchronous SMTP via Gmail

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
}

async function main() {
  const recipients: Recipient[] = await prisma.$queryRawUnsafe(
    "SELECT id, email, name, username FROM User WHERE marketingOptOut = false AND isBanned = false",
  );

  console.log(`[promo] ${recipients.length} eligible users found.`);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const u of recipients) {
    const already: { id: string }[] = await prisma.$queryRawUnsafe(
      "SELECT id FROM MarketingEmailLog WHERE userId = ? AND campaign = ? LIMIT 1",
      u.id, CAMPAIGN,
    );
    if (already.length > 0) {
      skipped++;
      continue;
    }

    try {
      await sendEmail({ to: u.email, ...generalPromoTemplate(u.name ?? u.username ?? "there") });
      await prisma.$executeRawUnsafe(
        "INSERT INTO MarketingEmailLog (id, userId, campaign, sentAt) VALUES (UUID(), ?, ?, NOW(3))",
        u.id, CAMPAIGN,
      );
      sent++;
      console.log(`[promo] sent to ${u.email} (${sent}/${recipients.length})`);
    } catch (err) {
      failed++;
      console.error(`[promo] FAILED for ${u.email}:`, err instanceof Error ? err.message : err);
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`[promo] done. sent=${sent} skipped(already sent)=${skipped} failed=${failed}`);
}

main()
  .catch((err) => { console.error("[promo] FATAL:", err instanceof Error ? err.message : err); process.exit(1); })
  .finally(() => prisma.$disconnect());
