import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'node:path';

/**
 * Vite config for a Chrome Extension MV3 build.
 *
 * We build THREE entry points:
 *   1. background   — service worker (IIFE, no DOM)
 *   2. content      — content script injected into every page (IIFE)
 *   3. popup        — React app rendered in the toolbar popup
 *   4. options      — React app rendered in the options page
 *
 * The content script's React overlay is also bundled here — it is mounted
 * into a Shadow DOM at runtime, not a separate HTML page.
 *
 * Static assets (manifest.json, icons) are copied verbatim via
 * vite-plugin-static-copy.
 */
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'public/manifest.json', dest: '' },
        { src: 'public/icons', dest: '' },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      input: {
        background: path.resolve(__dirname, 'src/background/index.ts'),
        content: path.resolve(__dirname, 'src/content/index.tsx'),
        popup: path.resolve(__dirname, 'popup.html'),
        options: path.resolve(__dirname, 'options.html'),
      },
      output: {
        entryFileNames: (chunk) => `${chunk.name}.js`,
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    // Code-splitting breaks MV3 service workers (they can't dynamic-import).
    // We rely on Rollup's default single-chunk-per-entry behaviour.
  },
  define: {
    'import.meta.env.VITE_BACKEND_URL': JSON.stringify(
      process.env.VITE_BACKEND_URL ?? 'http://localhost:3000',
    ),
    'import.meta.env.VITE_APP_URL': JSON.stringify(
      process.env.VITE_APP_URL ?? 'https://webtogether.app',
    ),
  },
});
