const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const { resolve } = require('path');

module.exports = defineConfig({
  plugins: [react()],
  base: './', // Use relative paths
  root: 'src', // Set src as root for dev server
  publicDir: false, // Don't copy public files in dev mode
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/index.html'),
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
