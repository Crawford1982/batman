import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: './',
  publicDir: 'portal',  // Use portal directory instead of public for portal build
  resolve: {
    alias: {
      // Point src imports to portal-src
      '/src': resolve(__dirname, 'portal-src')
    }
  },
  build: {
    outDir: 'dist-portal',
    emptyOutDir: true,
    sourcemap: false,  // Disable sourcemaps for portal build
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'portal/index.html')
      },
      output: {
        sourcemap: false  // Ensure sourcemaps are disabled
      }
    },
    assetsInlineLimit: 0,
    minify: false,
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
