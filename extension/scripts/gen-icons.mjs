#!/usr/bin/env node
/**
 * Generates PNG icons (16/32/48/128) from the master SVG.
 *
 * Chrome requires PNGs at those sizes for the manifest. We use the
 * `sharp` package — install it as a dev dependency before running:
 *
 *   pnpm add -D sharp
 *   node scripts/gen-icons.mjs
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const svgPath = join(here, '..', 'public', 'icons', 'icon.svg');
const svg = readFileSync(svgPath);

for (const size of [16, 32, 48, 128]) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(join(here, '..', 'public', 'icons', `icon-${size}.png`));
  console.log(`✓ icon-${size}.png`);
}
