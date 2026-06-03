// ─────────────────────────────────────────────────────
// @termuijs/tss — Tests for Runtime Theme Variable Overrides
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThemeEngine } from './engine.js';

const TSS_SOURCE = `
@theme default {
    --accent: blue;
}
@theme dark {
    --accent: green;
}

Gauge {
    color: var(--accent);
}
`;

describe('ThemeEngine runtime variables', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('setVariable updates getVariable', () => {
        const engine = new ThemeEngine();
        engine.load(TSS_SOURCE);

        expect(engine.getVariable('--accent')).toBe('blue');

        // Set variable override
        engine.setVariable('--accent', 'red');
        expect(engine.getVariable('--accent')).toBe('red');
    });

    it('setVariable re-resolves dependent rules', () => {
        const engine = new ThemeEngine();
        engine.load(TSS_SOURCE);

        // Initially resolves to blue (from default theme)
        let style = engine.resolveStyle('Gauge');
        expect(style.fg).toEqual({ type: 'named', name: 'blue' });

        // Override at runtime
        engine.setVariable('--accent', 'red');

        // Should resolve to new value red
        style = engine.resolveStyle('Gauge');
        expect(style.fg).toEqual({ type: 'named', name: 'red' });
    });

    it('setVariable notifies listeners once', () => {
        const engine = new ThemeEngine();
        engine.load(TSS_SOURCE);

        const listener = vi.fn();
        engine.onChange(listener);

        engine.setVariable('--accent', 'red');
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('clearVariable restores the theme value', () => {
        const engine = new ThemeEngine();
        engine.load(TSS_SOURCE);

        // Override
        engine.setVariable('--accent', 'red');
        expect(engine.getVariable('--accent')).toBe('red');

        // Clear override
        engine.clearVariable('--accent');

        // Falls back to theme value 'blue'
        expect(engine.getVariable('--accent')).toBe('blue');

        // Dependent rules re-resolve to blue
        const style = engine.resolveStyle('Gauge');
        expect(style.fg).toEqual({ type: 'named', name: 'blue' });
    });

    it('overrides survive theme variable re-apply only when re-applied after override', () => {
        const engine = new ThemeEngine();
        engine.load(TSS_SOURCE);

        // 1. Set override
        engine.setVariable('--accent', 'red');
        expect(engine.getVariable('--accent')).toBe('red');

        // 2. Switch theme (re-applies theme variables, overwriting/clearing existing overrides)
        engine.setTheme('dark');
        expect(engine.getVariable('--accent')).toBe('green'); // Resolves to theme-defined value

        // 3. Set override again after theme change
        engine.setVariable('--accent', 'purple');
        expect(engine.getVariable('--accent')).toBe('purple'); // Survives/applied on top of active theme
    });

    it('does not fail on unknown variable and simply adds it as override', () => {
        const engine = new ThemeEngine();
        engine.load(TSS_SOURCE);

        expect(engine.getVariable('--unknown')).toBeUndefined();

        engine.setVariable('--unknown', 'yellow');
        expect(engine.getVariable('--unknown')).toBe('yellow');
    });
});
