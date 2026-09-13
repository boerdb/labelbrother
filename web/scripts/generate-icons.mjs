import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

async function makeIcon(size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="100%" height="100%" rx="${size * 0.12}" fill="#1a5fb4"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
      font-family="Segoe UI, sans-serif" font-size="${size * 0.34}" font-weight="700" fill="#fff">BD</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(dir, `app-${size}.png`));
}

await makeIcon(192);
await makeIcon(512);
console.log("PWA-iconen gegenereerd");
