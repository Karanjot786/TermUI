import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      protocolImports: true,
      include: ['buffer', 'process', 'events', 'stream', 'string_decoder', 'util', 'path'],
      globals: {
        Buffer: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      'node:fs/promises': '/src/empty.ts',
      'fs/promises': '/src/empty.ts',
      'node:child_process': '/src/empty.ts',
      'child_process': '/src/empty.ts',
      'node:fs': '/src/empty.ts',
      'fs': '/src/empty.ts',
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});
