// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Digits widget
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { Digits } from './Digits.js';

describe('Digits', () => {
    it('renders a single digit', () => {
        const widget = new Digits({ value: '1', width: 10, height: 3 } as never);
        widget.updateRect({ x: 0, y: 0, width: 10, height: 3 });
        const screen = new Screen(10, 3);
        widget.render(screen);

        const rows = screen.back.map(row => row.map((cell: { char: string }) => cell.char).join(''));
        expect(rows.some(row => row.includes('|'))).toBe(true);
    });

    it('renders multiple digits', () => {
        const widget = new Digits({ value: '42', width: 20, height: 3 } as never);
        widget.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        const screen = new Screen(20, 3);
        widget.render(screen);

        const rows = screen.back.map(row => row.map((cell: { char: string }) => cell.char).join(''));
        expect(rows.some(row => row.includes('.'))).toBe(true);
    });

    it('setValue updates the value', () => {
        const widget = new Digits({} as never);
        widget.setValue('99');
        expect(widget.getValue()).toBe('99');
    });

    it('applies color prop to filled cells', () => {
        const widget = new Digits({ value: '1', width: 10, height: 3 } as never, {
            color: { type: 'named', name: 'cyan' },
        });
        widget.updateRect({ x: 0, y: 0, width: 10, height: 3 });
        const screen = new Screen(10, 3);
        widget.render(screen);

        const filledCells = screen.back.flat().filter((cell: { char: string }) => cell.char !== ' ');
        expect(filledCells.length).toBeGreaterThan(0);
    });

    it('renders colon and period', () => {
        const widget = new Digits({ value: '1:2.3', width: 30, height: 3 } as never);
        widget.updateRect({ x: 0, y: 0, width: 30, height: 3 });
        const screen = new Screen(30, 3);
        widget.render(screen);

        const rows = screen.back.map(row => row.map((cell: { char: string }) => cell.char).join(''));
        expect(rows.some(row => row.includes('*'))).toBe(true);
    });
});

describe('Digits – mutation regression tests', () => {
    it('does not mark dirty when value is unchanged', () => {
        const widget = new Digits({ value: '42' } as never);

        widget.clearDirty();
        widget.setValue('42');

        expect(widget.isDirty).toBe(false);
    });

    it('marks dirty when value changes', () => {
        const widget = new Digits({ value: '42' } as never);

        widget.clearDirty();
        widget.setValue('99');

        expect(widget.getValue()).toBe('99');
        expect(widget.isDirty).toBe(true);
    });

    it('does not mark dirty when color is unchanged', () => {
        const color = { type: 'named', name: 'cyan' } as const;

        const widget = new Digits(
            { value: '1' } as never,
            { color },
        );

        widget.clearDirty();
        widget.setColor(color);

        expect(widget.isDirty).toBe(false);
    });

    it('marks dirty when color changes', () => {
        const widget = new Digits(
            { value: '1' } as never,
            { color: { type: 'named', name: 'cyan' } },
        );

        widget.clearDirty();
        widget.setColor({ type: 'named', name: 'red' });

        expect(widget.isDirty).toBe(true);
    });
});
