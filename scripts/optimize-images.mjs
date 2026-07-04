/**
 * Convert the heavy mosaic PNGs to web-optimized WebP.
 *   node scripts/optimize-images.mjs
 * Resizes to max 1920px wide and encodes WebP q78 — typically a ~99% size cut.
 */
import sharp from 'sharp';
import fs    from 'fs';
import path  from 'path';

const DIR = 'public/mosaic';
const pngs = fs.readdirSync(DIR).filter(f => f.toLowerCase().endsWith('.png'));
let before = 0, after = 0;

for (const f of pngs) {
  const src = path.join(DIR, f);
  const out = path.join(DIR, f.replace(/\.png$/i, '.webp'));
  const b = fs.statSync(src).size;
  await sharp(src).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
  const a = fs.statSync(out).size;
  before += b; after += a;
  console.log(`  ${f.padEnd(14)} ${(b / 1e6).toFixed(1)}MB → ${(a / 1e3).toFixed(0)}KB  ${path.basename(out)}`);
}
console.log(`\n✅ ${pngs.length} images: ${(before / 1e6).toFixed(0)}MB → ${(after / 1e6).toFixed(2)}MB`);
