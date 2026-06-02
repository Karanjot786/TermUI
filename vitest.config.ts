import { defineConfig } from 'vitest/config';

export default defineConfig({
    esbuild: {
        jsx: 'automatic',
        jsxImportSource: '@termuijs/jsx',
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.test.tsx'],
        coverage: {
            provider: 'v8',
            include: ['packages/*/src/**/*.ts'],
            exclude: ['**/*.test.ts', '**/index.ts'],
        },
    },
});
