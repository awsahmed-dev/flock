#!/usr/bin/env node
/**
 * Generates PWA / favicon icons from public/logo/mark.svg.
 *
 * Renders the mark centered inside a bg-color square at each PWA-required
 * size (72 → 512). Sets a small safe-area padding so the mark doesn't kiss
 * the edges on circular/iOS masks.
 *
 * Run after the mark changes:
 *   node scripts/generate-icons.mjs
 */
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = dirname(dirname(__filename));
const OUT = join(ROOT, "public", "icons");
const SVG_PATH = join(ROOT, "public", "logo", "mark.svg");

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const BG = "#000000"; // matches landing-page black
const PADDING_RATIO = 0.18;

async function main() {
  await mkdir(OUT, { recursive: true });
  const svg = await readFile(SVG_PATH);

  for (const size of SIZES) {
    // Render the mark in white at slightly smaller than the canvas, then
    // composite on the black background.
    const inner = Math.round(size * (1 - PADDING_RATIO * 2));
    // Tint mark to white via composite with currentColor-style svg fill.
    // sharp doesn't inline-edit SVG fills; the source uses currentColor
    // which sharp resolves to black by default — pre-process the SVG so
    // it renders white on the dark canvas.
    const whiteSvg = svg.toString().replaceAll("currentColor", "#FFFFFF");
    const markBuf = await sharp(Buffer.from(whiteSvg))
      .resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const out = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BG,
      },
    })
      .composite([{ input: markBuf, gravity: "center" }])
      .png()
      .toBuffer();

    const path = join(OUT, `icon-${size}x${size}.png`);
    await writeFile(path, out);
    console.log(`  ✓ ${path}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
