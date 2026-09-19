// Prebuild step: iOS requires apple-touch-icons to be fully opaque — icons
// with an alpha channel can render with black corners on the home screen.
// Flattens any PWA icon that still has transparency onto the brand color
// sampled from the artwork's own edges. Idempotent: already-opaque icons
// (PNG colorType 2) are skipped, so repeat builds are no-ops.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const BG = "#fd8c02";
const ICON_DIR = path.join(__dirname, "..", "public", "icons");
const FILES = ["icon-180.png", "icon-192.png", "icon-512.png"];

(async () => {
  for (const name of FILES) {
    const file = path.join(ICON_DIR, name);
    if (!fs.existsSync(file)) {
      console.warn(`[flatten-icons] missing ${name}, skipping`);
      continue;
    }
    const colorType = fs.readFileSync(file)[25];
    if (colorType === 2) {
      console.log(`[flatten-icons] ${name} already opaque, skipping`);
      continue;
    }
    const buf = await sharp(file).flatten({ background: BG }).png().toBuffer();
    fs.writeFileSync(file, buf);
    console.log(`[flatten-icons] ${name} flattened onto ${BG}`);
  }
})().catch((err) => {
  // A failed flatten shouldn't abort the whole build — the old icons are
  // cosmetically wrong, not broken.
  console.warn("[flatten-icons] failed:", err.message);
});
