import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyStaticDirs(dirs: string[]): Plugin {
  return {
    name: 'copy-static-kartaflash-dirs',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html
          .replace(/\s*<link id="vite-hero-css"[^>]*\/?>/, '')
          .replace(
            /<script id="vite-hero-js"[^>]*><\/script>/,
            '<script type="module" src="/src/main.tsx"></script>'
          );
      },
    },
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist');
      for (const dir of dirs) {
        const src = path.resolve(__dirname, dir);
        const dest = path.join(outDir, dir);
        if (fs.existsSync(src)) {
          fs.cpSync(src, dest, { recursive: true });
        }
      }

      const distAssets = path.join(outDir, 'assets');
      const rootAssets = path.resolve(__dirname, 'assets');
      if (fs.existsSync(distAssets)) {
        fs.rmSync(rootAssets, { recursive: true, force: true });
        fs.cpSync(distAssets, rootAssets, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), copyStaticDirs(['css', 'js'])],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/hero-bundle.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/hero-bundle.[ext]',
      },
    },
  },
});
