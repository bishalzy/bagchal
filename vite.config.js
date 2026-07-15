import { defineConfig } from 'vite';

export default defineConfig({
  // Use relative paths for assets so it works on GitHub Pages subpaths or custom domains seamlessly.
  base: './',
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: './index.html',
        about: './about.html'
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
