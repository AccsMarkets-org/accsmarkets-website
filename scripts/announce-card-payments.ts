// One-off: publishes the "Card payments are here" site announcement banner.
// Run manually once TAGADA_API_KEY/NEXT_PUBLIC_TAGADA_ENABLED are live:
//   npx tsx scripts/announce-card-payments.ts
//
// Idempotent via an exact match on MESSAGE below — safe to re-run; a second
// run finds the existing row and exits without creating a duplicate banner.
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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client");
const prisma = new PrismaClient();

const MESSAGE = "💳 Card payments are here — deposit instantly with Visa, Mastercard, Apple Pay, or Google Pay.";

async function main() {
  const existing = await prisma.announcement.findFirst({ where: { message: MESSAGE } });
  if (existing) {
    console.log(`[announce] already published (id=${existing.id}), skipping.`);
    return;
  }

  const a = await prisma.announcement.create({
    data: {
      type: "SUCCESS",
      message: MESSAGE,
      linkUrl: "/dashboard/wallet",
      linkText: "Deposit now",
      targetAudience: "ALL",
      isActive: true,
    },
  });
  console.log(`[announce] published (id=${a.id}).`);
}

main()
  .catch((err) => { console.error("[announce] FATAL:", err instanceof Error ? err.message : err); process.exit(1); })
  .finally(() => prisma.$disconnect());
