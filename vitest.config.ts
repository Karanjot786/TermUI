import { defineConfig } from 'vitest/config';

export default defineConfig({
    esbuild: {
        jsx: 'automatic',
        jsxImportSource: '@termuijs/jsx',
    },
    test: {
        globals: true,
        environment: 'node',
        bail: 0,
        include: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.test.tsx'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['packages/*/src/**/*.ts'],
            exclude: ['**/*.test.ts', '**/index.ts', '**/node_modules/**', '**/dist/**'],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 75,
            },
        },
    },
});