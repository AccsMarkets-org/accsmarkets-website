const sharp = require("sharp");

const BG = "#fd8c02";
const files = ["icon-180.png", "icon-192.png", "icon-512.png"];

(async () => {
  for (const f of files) {
    const src = `public/icons/${f}`;
    await sharp(src).flatten({ background: BG }).png().toFile(src + ".flattened");
    console.log("flattened", f);
  }
})();
