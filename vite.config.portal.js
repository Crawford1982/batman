import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      // Point src imports to portal-src
      '/src': resolve(__dirname, 'portal-src')
    }
  },
  build: {
    outDir: 'dist-portal',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'portal/index.html')
      }
    },
    assetsInlineLimit: 0,
    // Disable minification for now (can enable later with proper dependencies)
    minify: false,
    // Smaller chunks for faster loading
    chunkSizeWarningLimit: 1000
  },
  // Ensure compatibility with iframe embedding
  server: {
    port: 4174,
    headers: {
      'X-Frame-Options': 'SAMEORIGIN'
    }
  }
});
