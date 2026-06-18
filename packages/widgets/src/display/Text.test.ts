// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Text widget
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Text } from './Text.js';
import { Screen } from '@termuijs/core';

function renderText(content: string, style = {}, props = {}, width = 20, height = 5) {
    const text = new Text(content, style, props);
    const screen = new Screen(width, height);
    text.updateRect({ x: 0, y: 0, width, height });
    text.render(screen);
    return { text, screen };
}

describe('Text', () => {
    it('renders text at correct position', () => {
        const { screen } = renderText('Hello');
        expect(screen.back[0][0].char).toBe('H');
        expect(screen.back[0][4].char).toBe('o');
    });

    it('setContent updates content', () => {
        const t = new Text('old');
        t.setContent('new');
        expect(t.getContent()).toBe('new');
    });

    it('applies bold style attribute', () => {
        const { screen } = renderText('Hi', { bold: true });
        expect(screen.back[0][0].bold).toBe(true);
    });

    it('handles empty string without error', () => {
        expect(() => renderText('')).not.toThrow();
    });

    it('wraps long text across lines', () => {
        const { screen } = renderText('Hello World', {}, { wrap: true }, 7, 5);
        // "Hello" on line 0, "World" on line 1
        expect(screen.back[0][0].char).toBe('H');
        expect(screen.back[1][0].char).not.toBe(' ');
    });
});

describe('Text – mutation regression tests', () => {
    it('does not mark dirty when content is unchanged', () => {
        const text = new Text('hello');

        text.clearDirty();
        text.setContent('hello');

        expect(text.isDirty).toBe(false);
    });

    it('marks dirty when content changes', () => {
        const text = new Text('hello');

        text.clearDirty();
        text.setContent('world');

        expect(text.getContent()).toBe('world');
        expect(text.isDirty).toBe(true);
    });

    it('does not mark dirty when scrollY is unchanged', () => {
        const text = new Text('hello', {}, { scrollY: 2 });

        text.clearDirty();
        text.setScrollY(2);

        expect(text.isDirty).toBe(false);
    });

    it('marks dirty when scrollY changes', () => {
        const text = new Text('hello', {}, { scrollY: 0 });

        text.clearDirty();
        text.setScrollY(3);

        expect(text.isDirty).toBe(true);
    });

    it('does not mark dirty when scrollX is unchanged', () => {
        const text = new Text('hello', {}, { scrollX: 2 });

        text.clearDirty();
        text.setScrollX(2);

        expect(text.isDirty).toBe(false);
    });

    it('marks dirty when scrollX changes', () => {
        const text = new Text('hello', {}, { scrollX: 0 });

        text.clearDirty();
        text.setScrollX(4);

        expect(text.isDirty).toBe(true);
    });
});