// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for ProgressCircle widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { ProgressCircle } from './ProgressCircle.js';

afterEach(() => {
    vi.restoreAllMocks();
});

function row(screen: Screen, y: number): string {
    return screen.back[y].map((c: { char: string }) => c.char).join('');
}

describe('ProgressCircle — value handling', () => {
    it('initializes with a value of 0', () => {
        const c = new ProgressCircle();
        expect(c.value).toBe(0);
    });

    it('initializes with the supplied value', () => {
        const c = new ProgressCircle({}, { value: 0.42 });
        expect(c.value).toBe(0.42);
    });

    it('setValue stores the value', () => {
        const c = new ProgressCircle();
        c.setValue(0.6);
        expect(c.value).toBe(0.6);
    });

    it('clamps values above 1 to 1', () => {
        const c = new ProgressCircle();
        c.setValue(1.5);
        expect(c.value).toBe(1);
    });

    it('clamps values below 0 to 0', () => {
        const c = new ProgressCircle();
        c.setValue(-0.5);
        expect(c.value).toBe(0);
    });

    it('NaN values clamp to 0', () => {
        const c = new ProgressCircle();
        c.setValue(Number.NaN);
        expect(c.value).toBe(0);
    });

    it('setValue marks the widget dirty', () => {
        const c = new ProgressCircle();
        (c as unknown as { _dirty: boolean })._dirty = false;

        c.setValue(0.5);

        expect(c.isDirty).toBe(true);
    });

    it('does not mark dirty when setValue receives the same value', () => {
        const c = new ProgressCircle({}, { value: 0.5 });

        c.clearDirty();

        c.setValue(0.5);

        expect(c.isDirty).toBe(false);
    });

    it('marks dirty when setValue receives a different value', () => {
        const c = new ProgressCircle({}, { value: 0.5 });

        c.clearDirty();

        c.setValue(0.75);

        expect(c.isDirty).toBe(true);
    });
});

describe('ProgressCircle — ASCII rendering', () => {
    it('renders an empty bar [--------] at value 0', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const c = new ProgressCircle({}, { value: 0, showLabel: false });
        c.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        c.render(screen);

        const rendered = row(screen, 0);
        expect(rendered).toBe('[--------]');
        expect(rendered).not.toContain('#');
    });

    it('renders a full bar [########] at value 1', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const c = new ProgressCircle({}, { value: 1, showLabel: false });
        c.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        c.render(screen);

        const rendered = row(screen, 0);
        expect(rendered).toBe('[########]');
        expect(rendered).not.toContain('-');
    });

    it('renders half fill at value 0.5', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const c = new ProgressCircle({}, { value: 0.5, showLabel: false });
        c.updateRect({ x: 0, y: 0, width: 10, height: 1 });
        const screen = new Screen(10, 1);
        c.render(screen);

        const rendered = row(screen, 0);
        expect(rendered.startsWith('[####')).toBe(true);
        expect(rendered.endsWith('----]')).toBe(true);
    });

    it('shows the percentage label when showLabel is true', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const c = new ProgressCircle({}, { value: 0.5, showLabel: true });
        c.updateRect({ x: 0, y: 0, width: 16, height: 1 });
        const screen = new Screen(16, 1);
        c.render(screen);

        const rendered = row(screen, 0).trimEnd();
        expect(rendered).toContain('50%');
    });
});

describe('ProgressCircle — unicode rendering', () => {
    it('uses braille chars (⣿ and ⠿) when unicode is available', () => {
        // Default caps.unicode in tests is true.

        const c = new ProgressCircle({}, { value: 0.5, showLabel: false });
        c.updateRect({ x: 0, y: 0, width: 8, height: 1 });
        const screen = new Screen(8, 1);
        c.render(screen);

        const rendered = row(screen, 0);
        expect(rendered).toMatch(/[⣿⠿]/);
        expect(rendered).not.toContain('#');
        expect(rendered).not.toContain('-');
    });

    it('renders all empty braille at value 0', () => {
        const c = new ProgressCircle({}, { value: 0, showLabel: false });
        c.updateRect({ x: 0, y: 0, width: 6, height: 1 });
        const screen = new Screen(6, 1);
        c.render(screen);

        const rendered = row(screen, 0);
        expect(rendered).toBe('⠿⠿⠿⠿⠿⠿');
    });

    it('renders all filled braille at value 1', () => {
        const c = new ProgressCircle({}, { value: 1, showLabel: false });
        c.updateRect({ x: 0, y: 0, width: 6, height: 1 });
        const screen = new Screen(6, 1);
        c.render(screen);

        const rendered = row(screen, 0);
        expect(rendered).toBe('⣿⣿⣿⣿⣿⣿');
    });

});

describe('ProgressCircle — accessibility regression tests', () => {
    it('renders 0% label when showLabel is enabled', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const c = new ProgressCircle({}, {
            value: 0,
            showLabel: true,
        });

        c.updateRect({ x: 0, y: 0, width: 16, height: 1 });

        const screen = new Screen(16, 1);

        c.render(screen);

        expect(row(screen, 0)).toContain('0%');
    });

    it('renders 100% label when showLabel is enabled', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const c = new ProgressCircle({}, {
            value: 1,
            showLabel: true,
        });

        c.updateRect({ x: 0, y: 0, width: 16, height: 1 });

        const screen = new Screen(16, 1);

        c.render(screen);

        expect(row(screen, 0)).toContain('100%');
    });

    it('does not overflow when width is smaller than the label width', () => {
        const c = new ProgressCircle({}, {
            value: 1,
            showLabel: true,
        });

        c.updateRect({
            x: 0,
            y: 0,
            width: 3,
            height: 1,
        });

        const screen = new Screen(3, 1);

        expect(() => c.render(screen)).not.toThrow();
    });

    it('clears all rows to prevent ghosting when height is larger than 1', () => {
        const c = new ProgressCircle({}, { value: 0 });
        c.updateRect({ x: 0, y: 0, width: 5, height: 3 });
        const screen = new Screen(5, 3);
        
        // Put some stale/ghost characters on row 0 and row 2
        screen.setCell(0, 0, { char: 'x' });
        screen.setCell(0, 2, { char: 'y' });
        
        c.render(screen);

        // Row 0 and row 2 should have been cleared to spaces
        expect(screen.back[0][0].char).toBe(' ');
        expect(screen.back[2][0].char).toBe(' ');
    });
});