// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for ScrollView widget
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { ScrollView } from './ScrollView.js';
import { Screen, type KeyEvent } from '@termuijs/core';

const key = (k: string): KeyEvent => ({
    key: k,
    raw: Buffer.alloc(0),
    ctrl: false,
    alt: false,
    shift: false,
    stopPropagation: () => {},
    preventDefault: () => {},
});

describe('ScrollView', () => {
    it('renders without error when content is taller than viewport', () => {
        const sv = new ScrollView({ width: 10, height: 5 }, { contentHeight: 20 });
        const screen = new Screen(10, 5);
        sv.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        expect(() => sv.render(screen)).not.toThrow();
    });

    it('scrollBy with positive delta increments scrollOffset', () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(1);
        expect(sv.scrollOffset).toBe(1);
    });

    it('scrollBy with negative delta decrements scrollOffset', () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(5);
        sv.scrollBy(-1);
        expect(sv.scrollOffset).toBe(4);
    });

    it('scrollBy floors offset at 0', () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(-5);
        expect(sv.scrollOffset).toBe(0);
    });

    it('scrollBy pages down by viewport height', () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(4);
        expect(sv.scrollOffset).toBe(4);
    });

    it('scrollBy pages up decrements offset and floors at 0', () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(10);
        expect(sv.scrollOffset).toBe(10);
        sv.scrollBy(-4);
        expect(sv.scrollOffset).toBe(6);
        sv.scrollBy(-20);
        expect(sv.scrollOffset).toBe(0);
    });

    it('clamps offset so it does not exceed contentHeight - viewHeight', () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 10 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(20);
        expect(sv.scrollOffset).toBe(5);
    });

    it('scrollTo sets exact offset clamped to valid range', () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 10 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollTo(3);
        expect(sv.scrollOffset).toBe(3);
        sv.scrollTo(-5);
        expect(sv.scrollOffset).toBe(0);
        sv.scrollTo(100);
        expect(sv.scrollOffset).toBe(5);
    });

    it('setContentHeight clamps offset when content shrinks', () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(15);
        expect(sv.scrollOffset).toBe(15);
        sv.setContentHeight(10);
        expect(sv.scrollOffset).toBe(5);
    });

    it('initial scrollOffset is 0', () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        expect(sv.scrollOffset).toBe(0);
    });

    it('renders scrollbar when content exceeds viewport', () => {
        const sv = new ScrollView({ width: 12, height: 5, border: 'single' }, { contentHeight: 20 });
        const screen = new Screen(12, 5);
        sv.updateRect({ x: 0, y: 0, width: 12, height: 5 });
        sv.render(screen);
        // Scrollbar track is drawn at the right edge of the content rect
        // Row 3 (y=1 + i=2) is track (not thumb) when scrollOffset=0
        expect(screen.back[3][11].char).toBe('\u2591');
    });

    it('renders without scrollbar when showScrollbar is false', () => {
        const sv = new ScrollView({ width: 10, height: 5 }, { contentHeight: 20, showScrollbar: false });
        const screen = new Screen(10, 5);
        sv.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        sv.render(screen);
        expect(screen.back[0][9].char).toBe(' ');
    });

    it('does not render scrollbar when content fits viewport', () => {
        const sv = new ScrollView({ width: 10, height: 5 }, { contentHeight: 3 });
        const screen = new Screen(10, 5);
        sv.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        sv.render(screen);
        expect(screen.back[0][9].char).toBe(' ');
    });

    it('down scrolls down by 1', () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.handleKey(key('down'));
        expect(sv.scrollOffset).toBe(1);
    });

    it('up scrolls up by 1', () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(5);
        sv.handleKey(key('up'));
        expect(sv.scrollOffset).toBe(4);
    });

    it('pagedown scrolls down by viewport height - 1', () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.handleKey(key('pagedown'));
        expect(sv.scrollOffset).toBe(4);
    });

    it('pageup scrolls up by viewport height - 1', () => {
        const sv = new ScrollView({ height: 5 }, { contentHeight: 20 });
        sv.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        sv.scrollBy(10);
        sv.handleKey(key('pageup'));
        expect(sv.scrollOffset).toBe(6);
    });
});
