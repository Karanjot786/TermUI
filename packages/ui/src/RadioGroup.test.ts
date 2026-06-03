// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for RadioGroup widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, createKeyEvent } from '@termuijs/core';
import { RadioGroup } from './RadioGroup.js';

const OPTIONS = [
    { label: 'Dark', value: 'dark' },
    { label: 'Light', value: 'light' },
    { label: 'System', value: 'system' },
];

const OPTIONS_WITH_DISABLED = [
    { label: 'Dark', value: 'dark' },
    { label: 'High Contrast', value: 'high-contrast', disabled: true },
    { label: 'Light', value: 'light' },
];

afterEach(() => {
    vi.restoreAllMocks();
});

describe('RadioGroup', () => {
    // ── 1. Default selection ───────────────────────────

    it('uses defaultValue as initial selection', () => {
        const radio = new RadioGroup({
            options: OPTIONS,
            defaultValue: 'light',
        });
        expect(radio.selectedValue).toBe('light');
        expect(radio.focusedIndex).toBe(1);
    });

    it('falls back to first enabled option when no defaultValue given', () => {
        const radio = new RadioGroup({ options: OPTIONS });
        expect(radio.selectedValue).toBe('dark');
        expect(radio.focusedIndex).toBe(0);
    });

    it('ignores defaultValue that matches a disabled option and picks first enabled', () => {
        const radio = new RadioGroup({
            options: OPTIONS_WITH_DISABLED,
            defaultValue: 'high-contrast',
        });
        // high-contrast is disabled, so should fall back to first enabled (dark)
        expect(radio.selectedValue).toBe('dark');
    });

    // ── 2. Arrow-key navigation ────────────────────────

    it('selectNext moves focus to the next option', () => {
        const radio = new RadioGroup({ options: OPTIONS, defaultValue: 'dark' });
        radio.selectNext();
        expect(radio.focusedIndex).toBe(1);
    });

    it('selectPrev moves focus to the previous option', () => {
        const radio = new RadioGroup({ options: OPTIONS, defaultValue: 'light' });
        radio.selectPrev();
        expect(radio.focusedIndex).toBe(0);
    });

    it('selectNext does not go past the last option', () => {
        const radio = new RadioGroup({ options: OPTIONS, defaultValue: 'system' });
        radio.selectNext();
        expect(radio.focusedIndex).toBe(2); // stays at last
    });

    it('selectPrev does not go before the first option', () => {
        const radio = new RadioGroup({ options: OPTIONS, defaultValue: 'dark' });
        radio.selectPrev();
        expect(radio.focusedIndex).toBe(0); // stays at first
    });

    it('handleKey up/down moves focus', () => {
        const radio = new RadioGroup({ options: OPTIONS, defaultValue: 'dark' });
        radio.handleKey(createKeyEvent({ key: 'down', ctrl: false, shift: false, alt: false, raw: Buffer.alloc(0) }));
        expect(radio.focusedIndex).toBe(1);
        radio.handleKey(createKeyEvent({ key: 'up', ctrl: false, shift: false, alt: false, raw: Buffer.alloc(0) }));
        expect(radio.focusedIndex).toBe(0);
    });

    // ── 3. onChange fires on Enter confirm ─────────────

    it('onChange fires when a new option is confirmed with enter', () => {
        const onChange = vi.fn();
        const radio = new RadioGroup({ options: OPTIONS, defaultValue: 'dark', onChange });

        radio.selectNext(); // move focus to 'light'
        radio.handleKey(createKeyEvent({ key: 'enter', ctrl: false, shift: false, alt: false, raw: Buffer.alloc(0) }));

        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange).toHaveBeenCalledWith('light');
        expect(radio.selectedValue).toBe('light');
    });

    it('onChange does not fire when confirming the already-selected option', () => {
        const onChange = vi.fn();
        const radio = new RadioGroup({ options: OPTIONS, defaultValue: 'dark', onChange });

        // confirm without moving — value unchanged
        radio.confirm();
        expect(onChange).not.toHaveBeenCalled();
    });

    // ── 4. Disabled options skipped during navigation ──

    it('selectNext skips disabled options', () => {
        const radio = new RadioGroup({
            options: OPTIONS_WITH_DISABLED,
            defaultValue: 'dark',
        });
        radio.selectNext(); // index 1 is disabled → should land on index 2 (light)
        expect(radio.focusedIndex).toBe(2);
    });

    it('confirm does nothing on a disabled option', () => {
        const onChange = vi.fn();
        // Manually force focus onto the disabled item by navigating backwards
        // from 'light' (index 2) to check confirm guard.
        const radio = new RadioGroup({
            options: OPTIONS_WITH_DISABLED,
            defaultValue: 'light',
            onChange,
        });
        // focusedIndex is 2 (light). Move prev — skips index 1 (disabled) → lands on 0
        radio.selectPrev();
        expect(radio.focusedIndex).toBe(0); // skipped disabled correctly
        expect(onChange).not.toHaveBeenCalled();
    });

    // ── 5. Render output ───────────────────────────────

    it('renders selected option with (o) marker', () => {
        const radio = new RadioGroup({ options: OPTIONS, defaultValue: 'dark' });
        const screen = new Screen(40, OPTIONS.length);
        radio.updateRect({ x: 0, y: 0, width: 40, height: OPTIONS.length });
        radio.render(screen);

        const row0 = screen.back[0]!.map((c) => c.char).join('');
        expect(row0).toContain('(o)');
        expect(row0).toContain('Dark');
    });

    it('renders unselected options with ( ) marker', () => {
        const radio = new RadioGroup({ options: OPTIONS, defaultValue: 'dark' });
        const screen = new Screen(40, OPTIONS.length);
        radio.updateRect({ x: 0, y: 0, width: 40, height: OPTIONS.length });
        radio.render(screen);

        const row1 = screen.back[1]!.map((c) => c.char).join('');
        expect(row1).toContain('( )');
        expect(row1).toContain('Light');
    });
});
