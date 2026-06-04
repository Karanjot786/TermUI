// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for MouseGestures
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { MouseGestures } from './MouseGestures.js';
import type { MouseEvent } from '../events/types.js';

describe('MouseGestures', () => {
    it('synthesizes double-click within window', () => {
        vi.useFakeTimers();
        const g = new MouseGestures({ doubleClickMs: 300 });
        const down: MouseEvent = { x: 1, y: 1, button: 'left', type: 'mousedown' };

        expect(g.feed({ ...down })).toEqual([]);
        vi.advanceTimersByTime(150);

        const out = g.feed({ ...down });
        expect(out).toEqual([
            { x: 1, y: 1, button: 'left', type: 'dblclick' }
        ]);

        vi.useRealTimers();
    });

    it('does not synthesize double-click outside window', () => {
        vi.useFakeTimers();
        const g = new MouseGestures({ doubleClickMs: 300 });
        const down: MouseEvent = { x: 1, y: 1, button: 'left', type: 'mousedown' };

        expect(g.feed({ ...down })).toEqual([]);
        vi.advanceTimersByTime(350);

        const out = g.feed({ ...down });
        expect(out).toEqual([]);

        vi.useRealTimers();
    });

    it('does not synthesize double-click if position is different', () => {
        vi.useFakeTimers();
        const g = new MouseGestures({ doubleClickMs: 300 });
        
        expect(g.feed({ x: 1, y: 1, button: 'left', type: 'mousedown' })).toEqual([]);
        vi.advanceTimersByTime(100);

        const out = g.feed({ x: 1, y: 2, button: 'left', type: 'mousedown' });
        expect(out).toEqual([]);

        vi.useRealTimers();
    });

    it('does not synthesize double-click if button is different', () => {
        vi.useFakeTimers();
        const g = new MouseGestures({ doubleClickMs: 300 });
        
        expect(g.feed({ x: 1, y: 1, button: 'left', type: 'mousedown' })).toEqual([]);
        vi.advanceTimersByTime(100);

        const out = g.feed({ x: 1, y: 1, button: 'right', type: 'mousedown' });
        expect(out).toEqual([]);

        vi.useRealTimers();
    });

    it('resets double click state after synthesis (no triple-click double click)', () => {
        vi.useFakeTimers();
        const g = new MouseGestures({ doubleClickMs: 300 });
        const down: MouseEvent = { x: 1, y: 1, button: 'left', type: 'mousedown' };

        expect(g.feed({ ...down })).toEqual([]);
        vi.advanceTimersByTime(100);

        expect(g.feed({ ...down })).toEqual([
            { x: 1, y: 1, button: 'left', type: 'dblclick' }
        ]);
        vi.advanceTimersByTime(100);

        // Third click should not trigger another double-click
        expect(g.feed({ ...down })).toEqual([]);
        vi.advanceTimersByTime(100);

        // Fourth click should trigger a second double-click
        expect(g.feed({ ...down })).toEqual([
            { x: 1, y: 1, button: 'left', type: 'dblclick' }
        ]);

        vi.useRealTimers();
    });

    it('synthesizes drag on move with button held', () => {
        const g = new MouseGestures();
        
        // Start press
        expect(g.feed({ x: 1, y: 1, button: 'left', type: 'mousedown' })).toEqual([]);

        // Move mouse
        const drag1 = g.feed({ x: 2, y: 2, button: 'left', type: 'mousemove' });
        expect(drag1).toEqual([
            { x: 2, y: 2, button: 'left', type: 'drag' }
        ]);

        const drag2 = g.feed({ x: 3, y: 3, button: 'left', type: 'mousemove' });
        expect(drag2).toEqual([
            { x: 3, y: 3, button: 'left', type: 'drag' }
        ]);
    });

    it('does not synthesize drag on move with button none / if not pressed', () => {
        const g = new MouseGestures();

        // Move mouse without prior mousedown
        const drag1 = g.feed({ x: 2, y: 2, button: 'none', type: 'mousemove' });
        expect(drag1).toEqual([]);
    });

    it('synthesizes dragend on release after drag', () => {
        const g = new MouseGestures();

        // Down -> Move -> Up
        expect(g.feed({ x: 1, y: 1, button: 'left', type: 'mousedown' })).toEqual([]);
        expect(g.feed({ x: 2, y: 2, button: 'left', type: 'mousemove' })).toEqual([
            { x: 2, y: 2, button: 'left', type: 'drag' }
        ]);
        expect(g.feed({ x: 2, y: 2, button: 'left', type: 'mouseup' })).toEqual([
            { x: 2, y: 2, button: 'left', type: 'dragend' }
        ]);
    });

    it('does not synthesize dragend on release if there was no drag', () => {
        const g = new MouseGestures();

        // Down -> Up (simple click)
        expect(g.feed({ x: 1, y: 1, button: 'left', type: 'mousedown' })).toEqual([]);
        expect(g.feed({ x: 1, y: 1, button: 'left', type: 'mouseup' })).toEqual([]);
    });

    it('does not mutate input event objects', () => {
        const g = new MouseGestures();
        const event: MouseEvent = { x: 1, y: 1, button: 'left', type: 'mousedown' };
        Object.freeze(event); // freeze to ensure no mutation can occur without throwing

        expect(() => g.feed(event)).not.toThrow();

        const move: MouseEvent = { x: 2, y: 2, button: 'left', type: 'mousemove' };
        Object.freeze(move);
        expect(() => g.feed(move)).not.toThrow();

        const up: MouseEvent = { x: 2, y: 2, button: 'left', type: 'mouseup' };
        Object.freeze(up);
        expect(() => g.feed(up)).not.toThrow();
    });
});
