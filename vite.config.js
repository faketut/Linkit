import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config.js';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Keep stable bundle structure under pages/assets/ for parity with the
        // pre-build repo layout — popup/options chunks share the vendor chunk.
        chunkFileNames: 'pages/assets/[name]-[hash].js',
        entryFileNames: 'pages/assets/[name]-[hash].js',
        assetFileNames: 'pages/assets/[name]-[hash][extname]',
      },
    },
  },
});
