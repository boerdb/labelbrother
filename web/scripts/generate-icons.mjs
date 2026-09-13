import { readFileSync } from "node:fs";
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const iconsDir = join(publicDir, "icons");
const sourceSvg = readFileSync(join(publicDir, "app-icon.svg"));

async function makeIcon(size) {
  await sharp(sourceSvg)
    .resize(size, size)
    .png()
    .toFile(join(iconsDir, `app-${size}.png`));
}

await makeIcon(192);
await makeIcon(512);
console.log("PWA-iconen gegenereerd");
