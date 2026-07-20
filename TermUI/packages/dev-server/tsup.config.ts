import { defineConfig } from 'tsup';
export default defineConfig({
    entry: ['src/index.ts', 'src/cli.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    target: 'es2022',
    sourcemap: true,
});
