import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',

    // 🔥 FIXES "Unexpected token export"
    deps: {
      inline: [
        '@termuijs/core',
        '@termuijs/jsx',
        '@termuijs/widgets',
      ],
    },

    // safer module handling
    server: {
      deps: {
        inline: true,
      },
    },
  },
});