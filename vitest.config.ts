import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['packages/*/src/**/*.test.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            include: ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'],
            exclude: ['**/*.test.{ts,tsx}', '**/index.ts'],
        },
    },
});
