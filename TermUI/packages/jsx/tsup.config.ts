import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/jsx-runtime.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    clean: true,
    sourcemap: true,
});
