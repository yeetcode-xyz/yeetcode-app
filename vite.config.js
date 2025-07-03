const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const { resolve } = require('path');

module.exports = defineConfig({
  plugins: [react()],
  base: './', // Use relative paths
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        renderer: resolve(__dirname, 'src/renderer.jsx'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
}); 