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

    it('handles horizontal scroll with wide characters at partial offset', () => {
        // Test scrollX landing in the middle of a wide character
        const { screen } = renderText('中a', {}, { scrollX: 1, wrap: false }, 10, 5);
        // When scrollX=1 lands in the middle of '中' (2 columns), should show space + 'a'
        expect(screen.back[0][0].char).toBe(' ');
        expect(screen.back[0][1].char).toBe('a');
    });

    it('handles horizontal scroll with wide characters at full offset', () => {
        // Test scrollX after a complete wide character
        const { screen } = renderText('中a', {}, { scrollX: 2, wrap: false }, 10, 5);
        // When scrollX=2 skips the entire '中', should show 'a'
        expect(screen.back[0][0].char).toBe('a');
    });

    it('handles horizontal scroll with emoji at partial offset', () => {
        // Test scrollX landing in the middle of an emoji
        const { screen } = renderText('😀a', {}, { scrollX: 1, wrap: false }, 10, 5);
        // When scrollX=1 lands in the middle of '😀' (2 columns), should show space + 'a'
        expect(screen.back[0][0].char).toBe(' ');
        expect(screen.back[0][1].char).toBe('a');
    });
});

describe('Text – raw mode sanitization', () => {
    it('strips OSC 52 clipboard exfiltration sequences even when raw', () => {
        const { screen } = renderText(
            '\x1b]52;c;ZXZpbA==\x07safe',
            {},
            { raw: true },
        );
        const text = screen.back[0].map(c => c.char).join('').trimEnd();
        expect(text).not.toContain('\x1b]52');
        expect(text).toBe('safe');
    });

    it('strips cursor movement and screen clear sequences even when raw', () => {
        const { screen } = renderText(
            '\x1b[2Jhi\x1b[10;20H',
            {},
            { raw: true },
        );
        const text = screen.back[0].map(c => c.char).join('').trimEnd();
        expect(text).not.toContain('\x1b[2J');
        expect(text).not.toContain('\x1b[10;20H');
        expect(text).toContain('hi');
    });

    it('does not sanitize away plain content when raw is true', () => {
        const { screen } = renderText('plain text', {}, { raw: true });
        const text = screen.back[0].map(c => c.char).join('').trimEnd();
        expect(text).toBe('plain text');
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