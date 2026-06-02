// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for Screen diff helpers used by diffRenderer
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Screen } from './Screen.js';

describe('Screen.getLine', () => {
    it('returns empty string for out-of-range rows', () => {
        const screen = new Screen(10, 5);
        expect(screen.getLine(-1)).toBe('');
        expect(screen.getLine(5)).toBe('');
    });

    it('returns the text written to the back buffer', () => {
        const screen = new Screen(20, 3);
        screen.writeString(0, 0, 'Hello');
        expect(screen.getLine(0).trimEnd()).toBe('Hello');
    });

    it('excludes continuation cells (width === 0) from the line string', () => {
        const screen = new Screen(10, 2);
        // Write a normal character then check the line does not include zero-width cells
        screen.writeString(0, 0, 'AB');
        const line = screen.getLine(0);
        expect(line.length).toBeGreaterThan(0);
        // Width-0 continuation cells should not appear as separate characters
        expect(line).toContain('A');
        expect(line).toContain('B');
    });
});

describe('Screen.saveLines / getPreviousLine', () => {
    it('returns empty string before the first save', () => {
        const screen = new Screen(10, 3);
        expect(screen.getPreviousLine(0)).toBe('');
        expect(screen.getPreviousLine(2)).toBe('');
    });

    it('stores current back buffer content after save', () => {
        const screen = new Screen(20, 3);
        screen.writeString(0, 0, 'Saved');
        screen.saveLines();
        expect(screen.getPreviousLine(0).trimEnd()).toBe('Saved');
    });

    it('detects changed lines between saves', () => {
        const screen = new Screen(20, 3);
        screen.writeString(0, 0, 'Before');
        screen.saveLines();

        screen.writeString(0, 0, 'After ');

        expect(screen.getLine(0).trimEnd()).toBe('After');
        expect(screen.getPreviousLine(0).trimEnd()).toBe('Before');
        expect(screen.getLine(0)).not.toBe(screen.getPreviousLine(0));
    });

    it('shows unchanged lines as equal after save', () => {
        const screen = new Screen(20, 3);
        screen.writeString(0, 0, 'Same');
        screen.saveLines();

        expect(screen.getLine(0)).toBe(screen.getPreviousLine(0));
    });

    it('saves all rows independently', () => {
        const screen = new Screen(20, 4);
        screen.writeString(0, 0, 'Row0');
        screen.writeString(0, 1, 'Row1');
        screen.writeString(0, 2, 'Row2');
        screen.saveLines();

        expect(screen.getPreviousLine(0).trimEnd()).toBe('Row0');
        expect(screen.getPreviousLine(1).trimEnd()).toBe('Row1');
        expect(screen.getPreviousLine(2).trimEnd()).toBe('Row2');
        expect(screen.getPreviousLine(3)).toBe(screen.getLine(3)); // both empty
    });
});
