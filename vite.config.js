import { defineConfig } from 'vite';

export default defineConfig({
  // Use absolute paths for assets so they resolve correctly on deep 404 paths (e.g. /fake/path/here)
  base: '/',
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: './index.html',
        about: './about.html',
        error: './404.html'
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  esbuild: {
    drop: ['console', 'debugger'],
  }
});
