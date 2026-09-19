// Hourly database backup: mysqldump -> Google Drive.
// Run via scripts/run-backup.ps1 (Windows Task Scheduler, hourly).
//
// Independent of the website process on purpose — a backup should keep
// working even if the app itself is down. Keeps a small local rolling
// window too, so a Drive outage doesn't leave zero recent backups.
import { execFile } from "child_process";
import { promisify } from "util";
import { readFileSync, writeFileSync, unlinkSync, readdirSync, statSync, mkdirSync } from "fs";
import path from "path";

// Next.js auto-loads .env at runtime; this standalone script runs outside
// that, so it needs its own minimal loader. `dotenv` isn't a dependency of
// this project — avoided adding one just for this.
function loadEnvFile(file: string) {
  const text = readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnvFile(path.join(__dirname, "..", ".env"));

// tsx (which runs this script) registers its require/import hook for the
// whole process, letting a .ts entry script import sibling .ts modules
// directly, same as the rest of the app. Note: this import is hoisted
// above loadEnvFile() by JS semantics regardless of source order — safe
// only because gdrive.ts reads process.env lazily inside its functions,
// not at module-load time, so it still sees the loaded values once called.
import { uploadToDrive, isDriveConfigured } from "../src/lib/gdrive";

const execFileAsync = promisify(execFile);

const MYSQLDUMP = "C:\\mysql84\\bin\\mysqldump.exe";
const LOCAL_BACKUP_DIR = path.join(__dirname, "..", "backups");
const LOCAL_KEEP = 24; // rolling local copies (~1 day at hourly cadence)

function parseDbUrl(url: string) {
  const m = url.match(/^mysql:\/\/([^:]+):([^@]*)@([^:/]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("Could not parse DATABASE_URL");
  const [, user, password, host, port, database] = m;
  return { user, password, host, port, database };
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");
  const { user, password, host, port, database } = parseDbUrl(dbUrl);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `accsmarkets-backup-${stamp}.sql`;

  mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
  const localPath = path.join(LOCAL_BACKUP_DIR, filename);

  console.log(`[backup] dumping ${database}@${host}:${port} ...`);
  const { stdout } = await execFileAsync(
    MYSQLDUMP,
    [
      `-h${host}`, `-P${port}`, `-u${user}`, `-p${password}`,
      "--single-transaction", "--quick", "--routines", "--triggers",
      database,
    ],
    { maxBuffer: 1024 * 1024 * 512 }, // 512MB — generous for this DB's current size
  );
  writeFileSync(localPath, stdout, "utf8");
  const sizeMb = (statSync(localPath).size / 1024 / 1024).toFixed(2);
  console.log(`[backup] dump written locally: ${filename} (${sizeMb} MB)`);

  // Upload to Google Drive using the app's existing storage credentials.
  try {
    if (!isDriveConfigured()) {
      console.warn("[backup] Google Drive not configured — keeping local copy only.");
    } else {
      const buffer = readFileSync(localPath);
      const url = await uploadToDrive(buffer, filename, "application/sql");
      console.log(`[backup] uploaded to Drive: ${url}`);
    }
  } catch (err) {
    console.error("[backup] Drive upload failed, local copy is still safe:", err instanceof Error ? err.message : err);
  }

  // Prune old local copies beyond the rolling window.
  const files = readdirSync(LOCAL_BACKUP_DIR)
    .filter((f) => f.startsWith("accsmarkets-backup-") && f.endsWith(".sql"))
    .sort();
  const excess = files.length - LOCAL_KEEP;
  for (let i = 0; i < excess; i++) {
    unlinkSync(path.join(LOCAL_BACKUP_DIR, files[i]));
    console.log(`[backup] pruned old local copy: ${files[i]}`);
  }

  console.log("[backup] done.");
}

main().catch((err) => {
  console.error("[backup] FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
