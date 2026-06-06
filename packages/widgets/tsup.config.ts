import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: false, // Turn off DTS temporarily to see if it fixes the crash
  sourcemap: true,
  clean: true,
  external: ['@termuijs/jsx', '@termuijs/core', 'react'],
});
