// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for MouseParser
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { parseMouseEvent, isMouseSequence } from './MouseParser.js';

describe('isMouseSequence', () => {
    it('detects SGR mouse prefix', () => {
        expect(isMouseSequence('\x1b[<0;10;5M')).toBe(true);
    });

    it('returns false for non-mouse sequences', () => {
        expect(isMouseSequence('\x1b[A')).toBe(false);
        expect(isMouseSequence('hello')).toBe(false);
    });
});

describe('parseMouseEvent', () => {
    it('parses left button press at (10, 5) → 0-based (9, 4)', () => {
        const evt = parseMouseEvent('\x1b[<0;10;5M');
        expect(evt).toMatchObject({ x: 9, y: 4, button: 'left', type: 'mousedown' });
    });

    it('parses right button release', () => {
        const evt = parseMouseEvent('\x1b[<2;10;5m');
        expect(evt).toMatchObject({ button: 'right', type: 'mouseup' });
    });

    it('parses scroll up event', () => {
        const evt = parseMouseEvent('\x1b[<64;10;5M');
        expect(evt).toMatchObject({ type: 'scroll', scrollDelta: -1 });
    });

    it('parses scroll down event', () => {
        const evt = parseMouseEvent('\x1b[<65;10;5M');
        expect(evt).toMatchObject({ type: 'scroll', scrollDelta: 1 });
    });

    it('parses mouse move (drag)', () => {
        const evt = parseMouseEvent('\x1b[<32;10;5M');
        expect(evt).toMatchObject({ type: 'mousemove' });
    });

    it('returns null for invalid input', () => {
        expect(parseMouseEvent('notamouse')).toBeNull();
    });
});
