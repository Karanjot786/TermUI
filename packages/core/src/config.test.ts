import { describe, expect, it } from 'vitest';
import { defineConfig, type TermUIConfig } from './config.js';

describe('defineConfig', () => {
    it('returns the config object unchanged', () => {
        const config = {
            theme: 'default',
            hotReload: true,
            router: { dir: './screens' },
        } satisfies TermUIConfig;

        expect(defineConfig(config)).toBe(config);
    });
});
