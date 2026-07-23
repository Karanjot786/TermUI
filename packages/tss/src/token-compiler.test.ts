import { describe, expect, it } from 'vitest';
import { compileThemeTokens, validateThemeTokens } from './token-compiler.js';
import { defaultDark } from './tokens.js';

describe('compileThemeTokens', () => {
    it('compiles typed tokens into variables and a stable @theme block', () => {
        const compiled = compileThemeTokens(defaultDark, { name: 'terminal-dark' });

        expect(compiled.name).toBe('terminal-dark');
        expect(compiled.variables['--primary']).toBe(defaultDark.primary);
        expect(compiled.tss).toContain('@theme terminal-dark');
        expect(compiled.tss.split('\n')[1]).toBe(`  --bg: ${defaultDark.bg};`);
    });

    it('resolves aliases before validation and output', () => {
        const compiled = compileThemeTokens(
            { ...defaultDark, background: '#101010' },
            { name: 'aliased', aliases: { background: 'bg' }, allowExtraTokens: true },
        );

        expect(compiled.tokens.bg).toBe('#101010');
        expect(compiled.variables['--bg']).toBe('#101010');
    });

    it('throws readable diagnostics for invalid token input', () => {
        expect(() => compileThemeTokens({ bg: '#000' }, { name: 'bad' }))
            .toThrow(/Missing required theme token: fg/);
    });
});

describe('validateThemeTokens', () => {
    it('reports unknown tokens unless extras are allowed', () => {
        const diagnostics = validateThemeTokens({ ...defaultDark, card: '#111111' });
        expect(diagnostics.some(diagnostic => diagnostic.code === 'unknown-token')).toBe(true);

        const filtered = validateThemeTokens({ ...defaultDark, card: '#111111' }, { allowExtraTokens: true });
        expect(filtered.some(diagnostic => diagnostic.code === 'unknown-token')).toBe(false);
    });

    it('reports aliases without a valid target', () => {
        const diagnostics = validateThemeTokens(defaultDark, {
            aliases: { accent: undefined },
        });

        expect(diagnostics.some(diagnostic => diagnostic.code === 'invalid-alias')).toBe(true);
    });
});
