/**
 * AccsMarkets – Daily Database Backup
 *
 * Saves a gzipped mysqldump to ./backups/ (keeps last 7) and ALSO
 * attempts an upload to Google Drive via the existing service account.
 *
 * Drive upload only works if the target folder is a Shared/Team Drive.
 * For personal Google Drive folders the service account lacks storage quota
 * and the upload will be skipped with a warning.
 *
 * Run manually:  node scripts/backup.mjs
 * Auto:          see setup-backup-task.bat (Windows Task Scheduler, 3 AM daily)
 */

import { spawn } from "child_process";
import { createGzip } from "zlib";
import {
  mkdirSync, writeFileSync, readdirSync, unlinkSync,
  readFileSync, existsSync, statSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createSign } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BACKUP_DIR = join(ROOT, "backups");

// ── Load .env ─────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

// ── Parse DATABASE_URL ────────────────────────────────────────────────────────
function parseDbUrl(url) {
  const m = url.match(/^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
  if (!m) throw new Error("Cannot parse DATABASE_URL: " + url);
  return { user: m[1], pass: m[2], host: m[3], port: m[4], db: m[5] };
}

// ── mysqldump ─────────────────────────────────────────────────────────────────
function runMysqldump(db) {
  return new Promise((resolve, reject) => {
    const mysqldump = "C:\\xampp\\mysql\\bin\\mysqldump.exe";
    const args = [
      `--host=${db.host}`, `--port=${db.port}`,
      `--user=${db.user}`, `--password=${db.pass}`,
      "--single-transaction", "--quick", "--routines", "--triggers",
      db.db,
    ];
    const chunks = [];
    const proc = spawn(mysqldump, args);
    proc.stdout.on("data", (c) => chunks.push(c));
    proc.stderr.on("data", (d) => {
      const msg = d.toString();
      if (msg.toLowerCase().includes("error")) console.warn("  mysqldump stderr:", msg.trim());
    });
    proc.on("close", (code) => {
      if (code !== 0) { reject(new Error(`mysqldump exited with code ${code}`)); return; }
      resolve(Buffer.concat(chunks));
    });
    proc.on("error", reject);
  });
}

// ── gzip ─────────────────────────────────────────────────────────────────────
function gzipBuffer(buf) {
  return new Promise((resolve, reject) => {
    const gz = createGzip({ level: 9 });
    const chunks = [];
    gz.on("data", (c) => chunks.push(c));
    gz.on("end", () => resolve(Buffer.concat(chunks)));
    gz.on("error", reject);
    gz.end(buf);
  });
}

// ── Local storage ─────────────────────────────────────────────────────────────
function saveLocally(gzBuf, filename) {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const filePath = join(BACKUP_DIR, filename);
  writeFileSync(filePath, gzBuf);
  return filePath;
}

function pruneLocalBackups(keepCount = 7) {
  if (!existsSync(BACKUP_DIR)) return;
  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".sql.gz"))
    .map((f) => ({ name: f, mtime: statSync(join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => a.mtime - b.mtime);

  if (files.length > keepCount) {
    for (const f of files.slice(0, files.length - keepCount)) {
      unlinkSync(join(BACKUP_DIR, f.name));
      console.log(`  Deleted old local backup: ${f.name}`);
    }
  }
}

// ── Google Drive auth ─────────────────────────────────────────────────────────
// Prefers OAuth refresh token (works with personal Drive).
// Falls back to service account JWT (only works with Shared/Team Drives).
let _gToken = null;
let _gTokenExpiry = 0;

function base64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function getGoogleTokenViaOAuth() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("OAuth token refresh failed: " + JSON.stringify(data));
  return data.access_token;
}

async function getGoogleTokenViaServiceAccount() {
  const keyJson = JSON.parse(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64url(Buffer.from(JSON.stringify({
    iss: keyJson.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  })));
  const sigInput = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(sigInput);
  const sig = base64url(sign.sign(keyJson.private_key));
  const jwt = `${sigInput}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Service account auth failed: " + JSON.stringify(data));
  return data.access_token;
}

async function getGoogleToken() {
  if (_gToken && Date.now() < _gTokenExpiry) return _gToken;

  let token;
  if (
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  ) {
    token = await getGoogleTokenViaOAuth();
    console.log("  Auth: OAuth (personal Drive)");
  } else {
    token = await getGoogleTokenViaServiceAccount();
    console.log("  Auth: Service Account (Shared Drive only)");
  }

  _gToken = token;
  _gTokenExpiry = Date.now() + 50 * 60 * 1000;
  return _gToken;
}

// ── Upload to Drive ───────────────────────────────────────────────────────────
async function uploadToDrive(gzBuf, filename, folderId) {
  const token = await getGoogleToken();
  const meta = JSON.stringify({ name: filename, parents: [folderId] });
  const boundary = "backup_xxyy_zz";
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/gzip\r\n\r\n`),
    gzBuf,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,size",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(body.length),
      },
      body,
    }
  );
  const data = await res.json();
  if (!data.id) throw new Error(data.error?.message ?? JSON.stringify(data));
  return data;
}

// ── Prune old Drive backups ───────────────────────────────────────────────────
async function pruneOldDriveBackups(folderId, keepCount = 7) {
  const token = await getGoogleToken();
  const q = encodeURIComponent(`'${folderId}' in parents and name contains 'accsmarkets-' and trashed=false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  const files = data.files ?? [];
  if (files.length > keepCount) {
    for (const f of files.slice(0, files.length - keepCount)) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?supportsAllDrives=true`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`  Deleted old Drive backup: ${f.name}`);
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== AccsMarkets Database Backup ===");
  console.log("Time:", new Date().toISOString());

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const db = parseDbUrl(process.env.DATABASE_URL);
  console.log(`Database: ${db.db} @ ${db.host}:${db.port}`);

  console.log("Running mysqldump…");
  const sqlBuf = await runMysqldump(db);
  console.log(`  SQL size: ${(sqlBuf.length / 1024 / 1024).toFixed(2)} MB`);

  console.log("Compressing…");
  const gzBuf = await gzipBuffer(sqlBuf);
  console.log(`  Compressed: ${(gzBuf.length / 1024).toFixed(1)} KB`);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `accsmarkets-${db.db}-${stamp}.sql.gz`;

  // ── Always save locally first ──────────────────────────────────────────────
  const localPath = saveLocally(gzBuf, filename);
  console.log(`Local backup saved: ${localPath}`);
  pruneLocalBackups(7);

  // ── Attempt Google Drive upload (best-effort) ──────────────────────────────
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const driveKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY;

  if (!folderId || !driveKey) {
    console.log("Drive upload skipped (GOOGLE_DRIVE_FOLDER_ID or GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY not set)");
  } else {
    try {
      console.log(`Uploading to Google Drive as "${filename}"…`);
      const result = await uploadToDrive(gzBuf, filename, folderId);
      console.log(`  Drive upload OK — File ID: ${result.id}  Size: ${result.size} bytes`);
      await pruneOldDriveBackups(folderId, 7);
    } catch (err) {
      // Non-fatal: local backup already saved
      console.warn(`  Drive upload FAILED (local backup still saved): ${err.message}`);
      console.warn("  To enable Drive uploads, use a Google Shared Drive (Team Drive) folder.");
    }
  }

  console.log("=== Backup complete ===\n");
}

main().catch((err) => {
  console.error("BACKUP FAILED:", err.message);
  process.exit(1);
});
