import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Lazy-chunk heavy runtime libraries so the initial bundle stays small.
        // Add real dependencies here as the site grows (e.g. syntax highlighters,
        // charting libs). Vite itself is a devDependency and must never appear here.
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});
