// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for MouseParser
// ─────────────────────────────────────────────────────

import { describe, it, expect, test } from 'vitest';
import { parseMouseEvent, isMouseSequence } from './MouseParser.js';

describe('parseMouseEvent modifier keys', () => {
  test('plain left click reports all modifiers false', () => {
    // button 0 (left), no modifiers → cb = 0
    const ev = parseMouseEvent('\x1b[<0;5;5M');
    expect(ev?.ctrl).toBe(false);
    expect(ev?.alt).toBe(false);
    expect(ev?.shift).toBe(false);
  });

  test('ctrl+click sets ctrl:true, alt/shift false', () => {
    // button 0 + ctrl bit (0b10000 = 16) → cb = 16
    const ev = parseMouseEvent('\x1b[<16;5;5M');
    expect(ev?.ctrl).toBe(true);
    expect(ev?.alt).toBe(false);
    expect(ev?.shift).toBe(false);
  });

  test('alt+click sets alt:true, ctrl/shift false', () => {
    // button 0 + alt bit (0b1000 = 8) → cb = 8
    const ev = parseMouseEvent('\x1b[<8;5;5M');
    expect(ev?.ctrl).toBe(false);
    expect(ev?.alt).toBe(true);
    expect(ev?.shift).toBe(false);
  });

  test('shift+click sets shift:true, ctrl/alt false', () => {
    // button 0 + shift bit (0b100 = 4) → cb = 4
    const ev = parseMouseEvent('\x1b[<4;5;5M');
    expect(ev?.ctrl).toBe(false);
    expect(ev?.alt).toBe(false);
    expect(ev?.shift).toBe(true);
  });
});

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
