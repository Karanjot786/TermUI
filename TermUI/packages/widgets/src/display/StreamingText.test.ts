// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for StreamingText widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { timerPoolUnsubscribeAll } from '@termuijs/motion';
import { Screen, caps } from '@termuijs/core';
import { StreamingText } from './StreamingText.js';

afterEach(() => {
    // Clean up any live timers started by mount()
    timerPoolUnsubscribeAll();
});

/** Helper: create widget, set rect, render to a screen, return both */
function renderWidget(
    options: ConstructorParameters<typeof StreamingText>[0],
    style: ConstructorParameters<typeof StreamingText>[1] = {},
    width = 40,
    height = 10,
) {
    const widget = new StreamingText(options, style);
    const screen = new Screen(width, height);
    widget.updateRect({ x: 0, y: 0, width, height });
    widget.render(screen);
    return { widget, screen };
}

/** Read a single row from the back buffer as a plain string */
function rowText(screen: Screen, row: number): string {
    return screen.back[row].map(c => c.char).join('').trimEnd();
}

// ── 1. speed = 0: show full text immediately ──────────────────────────────────
describe('StreamingText – speed: 0 (immediate)', () => {
    it('renders the full text when speed is 0', () => {
        const { screen } = renderWidget({ text: 'Hello', speed: 0 });
        const line = rowText(screen, 0);
        expect(line).toContain('Hello');
    });

    it('isComplete() returns true when speed is 0', () => {
        const { widget } = renderWidget({ text: 'Hello', speed: 0 });
        expect(widget.isComplete()).toBe(true);
    });
});

// ── 2. speed > 0: reveal incrementally ───────────────────────────────────────
describe('StreamingText – speed: 3 (incremental)', () => {
    it('reveals only the first speed chars after one tick', () => {
        const widget = new StreamingText({ text: 'ABCDEF', speed: 3 });
        // Force cursor invisible so it doesn't shift chars
        (widget as any)._cursorVisible = false;
        widget.tick(); // advance by speed (3)
        const screen = new Screen(40, 10);
        widget.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        widget.render(screen);

        const line = rowText(screen, 0);
        expect(line).toBe('ABC');
    });

    it('reveals nothing before any tick (starts at 0)', () => {
        const widget = new StreamingText({ text: 'ABCDEF', speed: 3 });
        (widget as any)._cursorVisible = false;
        const screen = new Screen(40, 10);
        widget.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        widget.render(screen);

        const line = rowText(screen, 0);
        expect(line).toBe('');
    });

    it('isComplete() returns false when text is not fully revealed', () => {
        const { widget } = renderWidget({ text: 'Hello World', speed: 3 });
        expect(widget.isComplete()).toBe(false);
    });
});

// ── 3. tick() advances _revealed by speed ────────────────────────────────────
describe('StreamingText – tick()', () => {
    it('advances revealed count by speed on each tick', () => {
        const widget = new StreamingText({ text: 'ABCDEFGHI', speed: 3 });
        (widget as any)._cursorVisible = false;

        widget.tick();
        expect((widget as any)._revealed).toBe(3);

        widget.tick();
        expect((widget as any)._revealed).toBe(6);

        widget.tick();
        expect((widget as any)._revealed).toBe(9);
    });

    it('tick() does not exceed text length', () => {
        const widget = new StreamingText({ text: 'ABC', speed: 5 });
        widget.tick();
        expect((widget as any)._revealed).toBe(3);
        expect(widget.isComplete()).toBe(true);
    });

    it('tick() is a no-op when speed is 0', () => {
        const widget = new StreamingText({ text: 'ABC', speed: 0 });
        widget.tick();
        expect((widget as any)._revealed).toBe(0);
    });

    it('tick() is a no-op after streaming is complete', () => {
        const widget = new StreamingText({ text: 'AB', speed: 5 });
        widget.tick(); // reveals all 2 chars (capped at 2)
        widget.tick(); // should stay at 2
        expect((widget as any)._revealed).toBe(2);
    });
});

// ── 4. isComplete() ───────────────────────────────────────────────────────────
describe('StreamingText – isComplete()', () => {
    it('returns false mid-stream', () => {
        const widget = new StreamingText({ text: 'Hello World', speed: 2 });
        widget.tick();
        expect(widget.isComplete()).toBe(false);
    });

    it('returns true when fully revealed', () => {
        const widget = new StreamingText({ text: 'Hi', speed: 5 });
        widget.tick();
        expect(widget.isComplete()).toBe(true);
    });
});

// ── 5. setText() resets revealed to 0 ────────────────────────────────────────
describe('StreamingText – setText()', () => {
    it('resets _revealed to 0 on new text', () => {
        const widget = new StreamingText({ text: 'Hello', speed: 3 });
        widget.tick(); // _revealed = 3
        widget.setText('New text here');
        expect((widget as any)._revealed).toBe(0);
        expect((widget as any)._text).toBe('New text here');
    });

    it('marks widget dirty after setText()', () => {
        const widget = new StreamingText({ text: 'Hello', speed: 3 });
        // Clear dirty first
        widget.clearDirty();
        widget.setText('World');
        expect(widget.isDirty).toBe(true);
    });
});

// ── 6. Cursor appears when _cursorVisible = true ──────────────────────────────
describe('StreamingText – cursor rendering', () => {
    it('appends cursor char when _cursorVisible is true', () => {
        const widget = new StreamingText({ text: 'Hi', speed: 0, cursor: '|' });
        (widget as any)._cursorVisible = true;
        const screen = new Screen(40, 10);
        widget.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        widget.render(screen);

        const line = rowText(screen, 0);
        expect(line).toBe('Hi|');
    });

    it('uses the default cursor character ▋', () => {
        const widget = new StreamingText({ text: 'Hi', speed: 0 });
        (widget as any)._cursorVisible = true;
        const screen = new Screen(40, 10);
        widget.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        widget.render(screen);

        const line = rowText(screen, 0);
        expect(line).toBe('Hi▋');
    });
});

// ── 7. Cursor hidden when _cursorVisible = false ──────────────────────────────
describe('StreamingText – cursor hidden', () => {
    it('omits cursor char when _cursorVisible is false', () => {
        const widget = new StreamingText({ text: 'Hi', speed: 0, cursor: '|' });
        (widget as any)._cursorVisible = false;
        const screen = new Screen(40, 10);
        widget.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        widget.render(screen);

        const line = rowText(screen, 0);
        expect(line).toBe('Hi');
    });
});

// ── 8. mount/unmount lifecycle ────────────────────────────────────────────────
describe('StreamingText – lifecycle', () => {
    let origMotion: boolean;
    beforeEach(() => { origMotion = caps.motion; (caps as any).motion = true; });
    afterEach(() => { (caps as any).motion = origMotion; });

    it('mount() sets up _blinkUnsub', () => {
        const widget = new StreamingText({ text: 'Hello' });
        expect((widget as any)._blinkUnsub).toBeUndefined();
        widget.mount();
        expect((widget as any)._blinkUnsub).toBeTypeOf('function');
        widget.unmount();
    });

    it('unmount() clears _blinkUnsub', () => {
        const widget = new StreamingText({ text: 'Hello' });
        widget.mount();
        widget.unmount();
        expect((widget as any)._blinkUnsub).toBeUndefined();
    });
});

// ── 9. caps.unicode cursor fallback ──────────────────────────────────────────
describe('StreamingText – caps.unicode cursor fallback', () => {
    it('uses ASCII cursor _ when caps.unicode is false and no explicit cursor given', () => {
        const orig = caps.unicode;
        (caps as any).unicode = false;
        try {
            const widget = new StreamingText({ text: 'Hi', speed: 0 });
            (widget as any)._cursorVisible = true;
            const screen = new Screen(40, 10);
            widget.updateRect({ x: 0, y: 0, width: 40, height: 10 });
            widget.render(screen);
            const line = rowText(screen, 0);
            expect(line).toBe('Hi_');
        } finally {
            (caps as any).unicode = orig;
        }
    });
});

// ── 11. Text wrapping ─────────────────────────────────────────────────────────
describe('StreamingText – text wrapping', () => {
    it('wraps long text across multiple lines', () => {
        const widget = new StreamingText({
            text: 'word1 word2 word3',
            speed: 0,
        });
        (widget as any)._cursorVisible = false;
        const screen = new Screen(8, 10);
        widget.updateRect({ x: 0, y: 0, width: 8, height: 10 });
        widget.render(screen);

        // At width=8 the text should span more than one row
        const row0 = rowText(screen, 0);
        const row1 = rowText(screen, 1);
        expect(row0.length).toBeGreaterThan(0);
        expect(row1.length).toBeGreaterThan(0);
    });

    it('renders nothing when height is 0', () => {
        expect(() => {
            const widget = new StreamingText({ text: 'Hello', speed: 0 });
            const screen = new Screen(20, 1);
            widget.updateRect({ x: 0, y: 0, width: 20, height: 0 });
            widget.render(screen);
        }).not.toThrow();
    });
});
