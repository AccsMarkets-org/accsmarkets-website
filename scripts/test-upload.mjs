import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createSign } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Load env
for (const line of readFileSync(join(ROOT, ".env"), "utf8").split("`n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const key = t.slice(0, eq).trim();
  let val = t.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  if (!process.env[key]) process.env[key] = val;
}

console.log("Drive folder:", process.env.GOOGLE_DRIVE_FOLDER_ID);
console.log("SA key set:", !!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY);

function base64url(buf) { return buf.toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,""); }
async function getToken() {
  const key = JSON.parse(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(Buffer.from(JSON.stringify({alg:"RS256",typ:"JWT"})));
  const payload = base64url(Buffer.from(JSON.stringify({iss:key.client_email,scope:"https://www.googleapis.com/auth/drive.file",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600})));
  const sign = createSign("RSA-SHA256"); sign.update(`${header}.${payload}`);
  const sig = base64url(sign.sign(key.private_key));
  const jwt = `${header}.${payload}.${sig}`;
  const res = await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:`grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`});
  const data = await res.json();
  if (!data.access_token) throw new Error(JSON.stringify(data));
  return data.access_token;
}
const token = await getToken();
console.log("Token OK:", token.slice(0,20)+"...");

// Upload 1x1 PNG
const buf = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==","base64");
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
const boundary = "testbound";
const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name:"test-logo.png",parents:[folderId]})}\r\n--${boundary}\r\nContent-Type: image/png\r\n\r\n`),buf,Buffer.from(`\r\n--${boundary}--`)]);
const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":`multipart/related; boundary=${boundary}`},body});
const d = await r.json();
console.log("Upload result:", JSON.stringify(d));
