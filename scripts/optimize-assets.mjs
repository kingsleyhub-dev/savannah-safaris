#!/usr/bin/env node
/**
 * Asset optimizer.
 *
 * Source of truth lives in `src/assets/` (where the originals were dropped by the team).
 * This script copies each original into a clean, page-based folder under `public/assets/`
 * and emits AVIF + WebP variants. Hero/gallery photos also get 480/768/1280/1920w widths
 * so <ResponsiveImage> can build srcset.
 *
 * Run: `node scripts/optimize-assets.mjs`
 *
 * Re-running is idempotent: existing variants are skipped unless `--force` is passed.
 */
import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src/assets");
const OUT = path.join(ROOT, "public/assets");
const FORCE = process.argv.includes("--force");

const WIDTHS = [480, 768, 1280, 1920];

/**
 * Manifest mapping each source image to its destination folder + role.
 * `responsive: true` triggers the multi-width pipeline.
 * Categories mirror the photo sections in the gallery so Cursor edits stay obvious.
 */
const MANIFEST = [
  // --- Homepage hero ---
  { src: "hero.jpg",                   dest: "homepage/images",           name: "hero",                responsive: true },

  // --- Shared logos (transparency required → keep PNG fallback, generate webp/avif) ---
  { src: "home-hero-logo-transparent.png", dest: "shared/logos",          name: "home-hero-logo",      transparent: true },
  { src: "logo-transparent.png",       dest: "shared/logos",              name: "logo",                transparent: true },

  // --- Gallery: bedrooms ---
  { src: "bedroom.jpg",       dest: "gallery/images/bedrooms",  name: "bedroom-1",      responsive: true },
  { src: "bedroom-alt1.jpg",  dest: "gallery/images/bedrooms",  name: "bedroom-1-alt1", responsive: true },
  { src: "bedroom-alt2.jpg",  dest: "gallery/images/bedrooms",  name: "bedroom-1-alt2", responsive: true },
  { src: "bedroom2.jpg",      dest: "gallery/images/bedrooms",  name: "bedroom-2",      responsive: true },
  { src: "bedroom2-alt1.jpg", dest: "gallery/images/bedrooms",  name: "bedroom-2-alt1", responsive: true },
  { src: "bedroom2-alt2.jpg", dest: "gallery/images/bedrooms",  name: "bedroom-2-alt2", responsive: true },

  // --- Gallery: living ---
  { src: "living.jpg",   dest: "gallery/images/living",  name: "living-1",  responsive: true },
  { src: "living2.jpg",  dest: "gallery/images/living",  name: "living-2",  responsive: true },

  // --- Gallery: dining ---
  { src: "dining.jpg",   dest: "gallery/images/dining",  name: "dining-1",  responsive: true },
  { src: "dining2.jpg",  dest: "gallery/images/dining",  name: "dining-2",  responsive: true },
  { src: "dining3.jpg",  dest: "gallery/images/dining",  name: "dining-3",  responsive: true },

  // --- Gallery: kitchen ---
  { src: "kitchen.jpg",  dest: "gallery/images/kitchen", name: "kitchen-1", responsive: true },
  { src: "kitchen2.jpg", dest: "gallery/images/kitchen", name: "kitchen-2", responsive: true },
  { src: "kitchen3.jpg", dest: "gallery/images/kitchen", name: "kitchen-3", responsive: true },

  // --- Gallery: bathrooms ---
  { src: "bathroom.jpg",      dest: "gallery/images/bathrooms", name: "bathroom-1",      responsive: true },
  { src: "bathroom-alt1.jpg", dest: "gallery/images/bathrooms", name: "bathroom-1-alt1", responsive: true },
  { src: "bathroom-alt2.jpg", dest: "gallery/images/bathrooms", name: "bathroom-1-alt2", responsive: true },

  // --- Gallery: views ---
  { src: "view.jpg",  dest: "gallery/images/views", name: "city-view", responsive: true },

  // --- Shared vehicles ---
  { src: "nissan.jpg", dest: "shared/vehicles", name: "nissan" },
];

const exists = async (p) => fs.access(p).then(() => true).catch(() => false);

async function processOne(entry) {
  const srcPath = path.join(SRC, entry.src);
  if (!(await exists(srcPath))) {
    console.warn(`!! missing ${entry.src}`);
    return;
  }
  const outDir = path.join(OUT, entry.dest);
  await fs.mkdir(outDir, { recursive: true });

  const ext = path.extname(entry.src).toLowerCase();
  const fallbackExt = entry.transparent ? ".png" : ".jpg";
  const fallbackPath = path.join(outDir, entry.name + fallbackExt);

  // Copy/convert the fallback (original-format file at original size)
  if (FORCE || !(await exists(fallbackPath))) {
    if (ext === fallbackExt) {
      await fs.copyFile(srcPath, fallbackPath);
    } else {
      const img = sharp(srcPath);
      if (entry.transparent) await img.png({ quality: 90 }).toFile(fallbackPath);
      else await img.jpeg({ quality: 82, mozjpeg: true }).toFile(fallbackPath);
    }
  }

  // WebP + AVIF at native size
  const webpPath = path.join(outDir, entry.name + ".webp");
  const avifPath = path.join(outDir, entry.name + ".avif");
  if (FORCE || !(await exists(webpPath))) {
    await sharp(srcPath).webp({ quality: 80, effort: 5 }).toFile(webpPath);
  }
  if (FORCE || !(await exists(avifPath))) {
    await sharp(srcPath).avif({ quality: 55, effort: 4 }).toFile(avifPath);
  }

  // Multi-width pipeline (responsive photos only)
  if (entry.responsive) {
    const meta = await sharp(srcPath).metadata();
    for (const w of WIDTHS) {
      if (meta.width && w > meta.width) continue; // never upscale
      for (const fmt of ["avif", "webp", entry.transparent ? "png" : "jpg"]) {
        const out = path.join(outDir, `${entry.name}-${w}.${fmt}`);
        if (!FORCE && (await exists(out))) continue;
        let pipeline = sharp(srcPath).resize({ width: w, withoutEnlargement: true });
        if (fmt === "avif") pipeline = pipeline.avif({ quality: 50, effort: 4 });
        else if (fmt === "webp") pipeline = pipeline.webp({ quality: 78, effort: 5 });
        else if (fmt === "jpg") pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
        else if (fmt === "png") pipeline = pipeline.png({ quality: 90 });
        await pipeline.toFile(out);
      }
    }
  }

  console.log(`✔ ${entry.src} → ${entry.dest}/${entry.name}`);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  for (const entry of MANIFEST) {
    await processOne(entry);
  }
  console.log("\nDone. Output: public/assets/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
