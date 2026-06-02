// ─────────────────────────────────────────────────────
// @termuijs/tss — Tests for size media queries
// ─────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { ThemeEngine } from './engine.js';
import { loadMediaStyles, resolveMediaSource } from './media.js';

const TSS_SOURCE = `
Box {
    color: red;
}

@media min-width 80 {
    Box {
        color: green;
    }
}

@media max-height 12 {
    Gauge {
        color: cyan;
    }
}
`;

describe('size media queries', () => {
    it('applies min-width rules when the terminal is wide enough', () => {
        const engine = new ThemeEngine();
        loadMediaStyles(engine, TSS_SOURCE, { width: 100, height: 20 });

        expect(engine.resolveStyle('Box').fg).toEqual({ type: 'named', name: 'green' });
    });

    it('skips min-width rules when the terminal is too narrow', () => {
        const engine = new ThemeEngine();
        loadMediaStyles(engine, TSS_SOURCE, { width: 60, height: 20 });

        expect(engine.resolveStyle('Box').fg).toEqual({ type: 'named', name: 'red' });
    });

    it('applies max-height rules when the terminal is short enough', () => {
        const engine = new ThemeEngine();
        loadMediaStyles(engine, TSS_SOURCE, { width: 60, height: 10 });

        expect(engine.resolveStyle('Gauge').fg).toEqual({ type: 'named', name: 'cyan' });
    });

    it('skips max-height rules when the terminal is too tall', () => {
        const engine = new ThemeEngine();
        loadMediaStyles(engine, TSS_SOURCE, { width: 60, height: 20 });

        expect(engine.resolveStyle('Gauge').fg).toBeUndefined();
    });

    it('ignores malformed media blocks without throwing', () => {
        const engine = new ThemeEngine();

        expect(() => loadMediaStyles(engine, `
@media min-width {
    Box {
        color: green;
    }
}

Gauge {
    bold: true;
}
`, { width: 100, height: 20 })).not.toThrow();

        expect(engine.resolveStyle('Gauge').bold).toBe(true);
        expect(engine.resolveStyle('Box').fg).toBeUndefined();
    });

    it('keeps non-media stylesheets unchanged', () => {
        const source = `
Box {
    border: single;
}
`;

        expect(resolveMediaSource(source, { width: 80, height: 24 })).toBe(source);
    });
});
