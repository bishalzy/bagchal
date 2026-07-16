import { defineConfig } from 'vite';

// Custom plugin to strip HTML comments during build
const stripHtmlComments = () => {
  return {
    name: 'strip-html-comments',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/<!--[\s\S]*?-->/g, '');
    }
  };
};

export default defineConfig({
  plugins: [stripHtmlComments()],
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
