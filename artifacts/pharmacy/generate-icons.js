import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const svgPath = path.join(__dirname, "public", "pwa-512x512.svg");
const png192Path = path.join(__dirname, "public", "pwa-192x192.png");
const png512Path = path.join(__dirname, "public", "pwa-512x512.png");

async function generate() {
  if (!fs.existsSync(svgPath)) {
    console.error("SVG not found!");
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(svgPath);

  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(png192Path);
  console.log("Generated 192x192 PNG");

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(png512Path);
  console.log("Generated 512x512 PNG");
}

generate().catch(console.error);
