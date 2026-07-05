#!/usr/bin/env node
/**
 * Zips the built extension into a Chrome-loadable .zip.
 * Run after `pnpm build` — expects ./dist to exist.
 */
import { createWriteStream, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import archiver from 'archiver';

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, '..', 'dist');
const outZip = resolve(here, '..', 'webtogether-extension.zip');

const archive = archiver('zip', { zlib: { level: 9 } });
const out = createWriteStream(outZip);

out.on('close', () => {
  console.log(`✓ ${outZip} (${(archive.pointer() / 1024).toFixed(1)} KB)`);
});
archive.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

archive.pipe(out);
archive.directory(distDir, false);
archive.finalize();
