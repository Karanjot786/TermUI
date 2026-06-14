// ─────────────────────────────────────────────────────
// @termuijs/tss — Tests for ThemeProvider singleton
// ─────────────────────────────────────────────────────

import { describe, it, expect, afterEach } from 'vitest';
import { ThemeProvider, defaultDark, defaultLight } from './themeProvider.js';

// Reset singleton state between tests so they remain isolated
afterEach(() => {
    ThemeProvider.reset();
});

describe('ThemeProvider', () => {
    it('getTheme returns a theme object by default', () => {
        const theme = ThemeProvider.getTheme();
        expect(theme).toBeDefined();
        expect(typeof theme.bg).toBe('string');
        expect(typeof theme.fg).toBe('string');
        expect(typeof theme.primary).toBe('string');
    });

    it('setTheme updates the active theme', () => {
        ThemeProvider.setTheme(defaultLight);
        expect(ThemeProvider.getTheme()).toBe(defaultLight);

        ThemeProvider.setTheme(defaultDark);
        expect(ThemeProvider.getTheme()).toBe(defaultDark);
    });

    it('setTheme notifies all subscribers', () => {
        const received: string[] = [];
        const unsub = ThemeProvider.subscribe((t) => received.push(t.bg));

        ThemeProvider.setTheme(defaultLight);
        ThemeProvider.setTheme(defaultDark);

        expect(received).toEqual([defaultLight.bg, defaultDark.bg]);
        unsub();
    });

    it('subscriber receives the new theme object', () => {
        let capturedTheme: unknown;
        const unsub = ThemeProvider.subscribe((t) => { capturedTheme = t; });

        const customTheme = { ...defaultDark, bg: '#abcdef' };
        ThemeProvider.setTheme(customTheme);

        expect(capturedTheme).toBe(customTheme);
        unsub();
    });

    it('unsubscribe stops future notifications', () => {
        const calls: number[] = [];
        const unsub = ThemeProvider.subscribe(() => calls.push(1));

        ThemeProvider.setTheme(defaultLight);
        unsub();
        ThemeProvider.setTheme(defaultDark);

        expect(calls).toHaveLength(1);
    });

    it('multiple subscribers all receive notifications', () => {
        const a: string[] = [];
        const b: string[] = [];
        const unsubA = ThemeProvider.subscribe((t) => a.push(t.bg));
        const unsubB = ThemeProvider.subscribe((t) => b.push(t.bg));

        ThemeProvider.setTheme(defaultLight);

        expect(a).toEqual([defaultLight.bg]);
        expect(b).toEqual([defaultLight.bg]);
        unsubA();
        unsubB();
    });

    it('listenerCount reflects active subscription count', () => {
        expect(ThemeProvider.listenerCount()).toBe(0);

        const unsub1 = ThemeProvider.subscribe(() => {});
        expect(ThemeProvider.listenerCount()).toBe(1);

        const unsub2 = ThemeProvider.subscribe(() => {});
        expect(ThemeProvider.listenerCount()).toBe(2);

        unsub1();
        expect(ThemeProvider.listenerCount()).toBe(1);

        unsub2();
        expect(ThemeProvider.listenerCount()).toBe(0);
    });

    it('reset restores the default theme without notifying subscribers', () => {
        const calls: number[] = [];
        const unsub = ThemeProvider.subscribe(() => calls.push(1));

        ThemeProvider.setTheme({ ...defaultDark, bg: '#ff0000' });
        ThemeProvider.reset();

        // reset() must NOT fire subscribers
        expect(calls).toHaveLength(1); // only from setTheme above

        // After reset, theme is one of the system defaults
        const theme = ThemeProvider.getTheme();
        expect([defaultDark.bg, defaultLight.bg]).toContain(theme.bg);
        unsub();
    });

    it('setTheme with a custom theme object is reflected in getTheme', () => {
        const myTheme = {
            bg: '#1a1a2e',
            fg: '#eaeaea',
            primary: '#e94560',
            secondary: '#0f3460',
            success: '#16213e',
            warning: '#f59e0b',
            error: '#ef4444',
            muted: '#6b7280',
            border: '#374151',
            highlight: '#533483',
        };

        ThemeProvider.setTheme(myTheme);
        expect(ThemeProvider.getTheme()).toBe(myTheme);
    });
});
