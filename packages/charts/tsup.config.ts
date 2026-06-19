import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: { resolve: true },
    splitting: false,
    sourcemap: true,
    clean: true,
    target: 'node18',
    outDir: 'dist',
    external: ['@termuijs/core', '@termuijs/widgets'],
});
