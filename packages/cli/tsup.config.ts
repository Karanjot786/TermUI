import { defineConfig } from 'tsup';
export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: false,
    clean: true,
    target: 'es2022',
    sourcemap: true,
    banner: { js: '#!/usr/bin/env node' },
});
