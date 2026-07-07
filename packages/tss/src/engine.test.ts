// ─────────────────────────────────────────────────────
// @termuijs/tss — Tests for Theme Engine
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { ThemeEngine } from './engine.js';

const TSS_SOURCE = `
@theme default {
    --primary: cyan;
    --border: single;
}
@theme dark {
    --primary: #ff00ff;
    --border: round;
}

Box {
    border: var(--border);
    bold: true;
}

Gauge {
    color: var(--primary);
}
`;

describe('ThemeEngine', () => {
    it('load() parses TSS and sets up default theme', () => {
        const engine = new ThemeEngine();
        engine.load(TSS_SOURCE);
        expect(engine.activeTheme).toBe('default');
        expect(engine.availableThemes).toContain('default');
        expect(engine.availableThemes).toContain('dark');
    });

    it('getVariable resolves variable from active theme', () => {
        const engine = new ThemeEngine();
        engine.load(TSS_SOURCE);
        expect(engine.getVariable('--primary')).toBe('cyan');
    });

    it('setTheme switches theme and updates variables', () => {
        const engine = new ThemeEngine();
        engine.load(TSS_SOURCE);
        engine.setTheme('dark');
        expect(engine.activeTheme).toBe('dark');
        expect(engine.getVariable('--primary')).toBe('#ff00ff');
    });

    it('resolveStyle returns matching properties', () => {
        const engine = new ThemeEngine();
        engine.load(TSS_SOURCE);
        const style = engine.resolveStyle('Box');
        expect(style.border).toBe('single');
        expect(style.bold).toBe(true);
    });

    it('resolveStyle resolves var() references', () => {
        const engine = new ThemeEngine();
        engine.load(TSS_SOURCE);
        const style = engine.resolveStyle('Gauge');
        expect(style.fg).toEqual({ type: 'named', name: 'cyan' });
    });

    it('resolves multi-value padding and margin declarations', () => {
        const engine = new ThemeEngine();
        engine.load(`
            Box {
                padding: 1 2;
                margin: 1 2 3 4;
            }
        `);

        const style = engine.resolveStyle('Box');
        expect(style.padding).toEqual({ top: 1, bottom: 1, left: 2, right: 2 });
        expect(style.margin).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
    });

    it('resolves calc expressions in numeric style properties', () => {
        const engine = new ThemeEngine();
        engine.load(`
            Box {
                width: calc(10 - 2);
            }
        `);

        const style = engine.resolveStyle('Box');
        expect(style.width).toBe(8);
    });

    it('onChange notifies listeners on theme switch', () => {
        const engine = new ThemeEngine();
        engine.load(TSS_SOURCE);
        const fn = vi.fn();
        engine.onChange(fn);
        engine.setTheme('dark');
        expect(fn).toHaveBeenCalled();
    });

    it('onChange returns unsubscribe function', () => {
        const engine = new ThemeEngine();
        engine.load(TSS_SOURCE);
        const fn = vi.fn();
        const unsub = engine.onChange(fn);
        unsub();
        engine.setTheme('dark');
        expect(fn).not.toHaveBeenCalled();
    });

    it('loadAll merges multiple sources', () => {
        const engine = new ThemeEngine();
        engine.loadAll([
            '@theme default { --a: red; }',
            'Box { bold: true; }',
        ]);
        expect(engine.getVariable('--a')).toBe('red');
        expect(engine.rules.length).toBeGreaterThan(0);
    });

    // ── @keyframes pipeline ──

    it('engine.load() preserves @keyframes observable via getKeyframes()', () => {
        const engine = new ThemeEngine();
        engine.load(`@keyframes fade { 0% { opacity: 0; } 100% { opacity: 1; } }\nBox { bold: true; }`);

        const decls = engine.getKeyframes();
        expect(decls).toHaveLength(1);
        expect(decls[0].name).toBe('fade');
        expect(decls[0].frames).toEqual({
            '0%':   { opacity: '0' },
            '100%': { opacity: '1' },
        });

        // Engine must still resolve regular rules after loading @keyframes
        const style = engine.resolveStyle('Box');
        expect(style.bold).toBe(true);
    });

    it('loadAll() preserves keyframes from merged sources observable via getKeyframes()', () => {
        const engine = new ThemeEngine();
        engine.loadAll([
            '@keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }',
            '@keyframes slideUp { 0% { y: 10; } 100% { y: 0; } }',
        ]);

        const decls = engine.getKeyframes();
        expect(decls).toHaveLength(2);
        expect(decls.map(d => d.name)).toEqual(['fadeIn', 'slideUp']);
    });
});
