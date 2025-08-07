import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths
  root: 'src', // Set src as root for dev server
  publicDir: false, // Don't copy public files in dev mode
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(fileURLToPath(new URL('.', import.meta.url)), 'src/index.html'),
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
