import { defineConfig } from 'tsup';

export default defineConfig([
    {
        entry: ['src/index.ts'],
        format: ['esm', 'cjs'],
        dts: true,
        clean: true,
        target: 'es2022',
        sourcemap: true,
    },
    {
        entry: ['src/cli.ts'],
        format: ['esm'],
        dts: false,
        clean: false,
        target: 'es2022',
        sourcemap: true,
        banner: { js: '#!/usr/bin/env bun' },
    },
]);
