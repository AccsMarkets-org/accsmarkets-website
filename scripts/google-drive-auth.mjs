/**
 * One-time Google Drive OAuth setup.
 *
 * Run this ONCE to get a refresh token for your personal Google Drive.
 * The refresh token is then stored in .env and used by backup.mjs.
 *
 * Steps:
 *   1. Go to https://console.cloud.google.com/apis/credentials
 *   2. Create an OAuth 2.0 Client ID → "Web application"
 *   3. Add  http://localhost:8989/callback  as an Authorized Redirect URI
 *   4. Copy the Client ID + Secret into .env (or pass as env vars below)
 *   5. Run:  node scripts/google-drive-auth.mjs
 *   6. Visit the printed URL, approve access, and the script saves the token.
 */

import { createServer } from "http";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENV_PATH = join(ROOT, ".env");

// ── Load .env ─────────────────────────────────────────────────────────────────
function loadEnv() {
  if (!existsSync(ENV_PATH)) return;
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
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

// ── Write / update a key in .env ──────────────────────────────────────────────
function upsertEnvKey(key, value) {
  let content = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
  const regex = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}="${value}"`;
  if (regex.test(content)) {
    content = content.replace(regex, line);
  } else {
    content = content.trimEnd() + `\n${line}\n`;
  }
  writeFileSync(ENV_PATH, content);
}

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:8989/callback";
const SCOPE = "https://www.googleapis.com/auth/drive.file";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(`
ERROR: GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET are not set.

How to get them:
  1. Go to https://console.cloud.google.com/apis/credentials
  2. Click "Create Credentials" → "OAuth 2.0 Client ID"
  3. Application type: Web application
  4. Authorized redirect URIs → Add: http://localhost:8989/callback
  5. Copy the Client ID and Secret
  6. Add to your .env file:
       GOOGLE_OAUTH_CLIENT_ID="your-client-id"
       GOOGLE_OAUTH_CLIENT_SECRET="your-client-secret"
  7. Run this script again.
`);
  process.exit(1);
}

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log("\n=== Google Drive OAuth Setup ===\n");
console.log("Open this URL in your browser and approve access:\n");
console.log(authUrl);
console.log("\nWaiting for callback on http://localhost:8989 ...\n");

// ── Mini HTTP server to catch the redirect ────────────────────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:8989");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end(`<h2>Error: ${error}</h2><p>You can close this tab.</p>`);
    console.error("OAuth error:", error);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end("<h2>No code received.</h2>");
    return;
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();

  if (!tokens.refresh_token) {
    res.writeHead(500, { "Content-Type": "text/html" });
    res.end(`<h2>No refresh token received.</h2><pre>${JSON.stringify(tokens, null, 2)}</pre>`);
    console.error("No refresh_token in response:", tokens);
    server.close();
    return;
  }

  upsertEnvKey("GOOGLE_OAUTH_REFRESH_TOKEN", tokens.refresh_token);
  console.log("SUCCESS! Refresh token saved to .env as GOOGLE_OAUTH_REFRESH_TOKEN");
  console.log("You can now run backup.mjs and it will upload to your Google Drive.\n");

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`
    <h2 style="color:green">✓ Authorization successful!</h2>
    <p>Refresh token saved to <code>.env</code> as <code>GOOGLE_OAUTH_REFRESH_TOKEN</code>.</p>
    <p>You can close this tab and return to the terminal.</p>
  `);

  server.close();
});

server.listen(8989);
