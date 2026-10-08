import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: './',
  publicDir: false,  // Disable publicDir - manually copy needed files instead
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
        main: resolve(__dirname, 'index.portal.html')
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
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
