import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { Markdown } from './Markdown.js';

afterEach(() => {
    vi.restoreAllMocks();
});

function render(content: string, width = 40, height = 20) {
    const w = new Markdown({ content });
    const screen = new Screen(width, height);
    w.updateRect({ x: 0, y: 0, width, height });
    w.render(screen);
    return screen;
}

describe('Markdown', () => {
    it('renders heading text with bold and underline', () => {
        const screen = render('# Hello');
        expect(screen.back[0][0].char).toBe('H');
        expect(screen.back[0][0].bold).toBe(true);
        expect(screen.back[0][0].underline).toBe(true);
    });

    it('renders bold text via ** markers', () => {
        const screen = render('**bold**');
        expect(screen.back[0][0].char).toBe('b');
        expect(screen.back[0][0].bold).toBe(true);
    });

    it('renders italic text via _ markers', () => {
        const screen = render('_italic_');
        expect(screen.back[0][0].char).toBe('i');
        expect(screen.back[0][0].italic).toBe(true);
    });

    it('renders inline code with inverse style', () => {
        const screen = render('`code`');
        expect(screen.back[0][0].char).toBe('c');
        expect(screen.back[0][0].inverse).toBe(true);
    });

    it('renders blockquote with │ prefix and italic style', () => {
        const screen = render('> quote text');
        const row = screen.back[0].map(c => c.char).join('');
        expect(row).toContain('│');
        expect(row).toContain('quote text');
        // All cells in the blockquote row should be italic
        const pipeCell = screen.back[0][0];
        expect(pipeCell.italic).toBe(true);
    });

    it('renders bullet list items with • when unicode is enabled', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const screen = render('- item one');
        expect(screen.back[0][0].char).toBe('•');
    });

    it('renders bullet list items with * when unicode is disabled', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const screen = render('- item one');
        expect(screen.back[0][0].char).toBe('*');
    });

    it('renders ordered list items preserving numbers', () => {
        const screen = render('1. First item');
        expect(screen.back[0][0].char).toBe('1');
        expect(screen.back[0][1].char).toBe('.');
    });

    it('renders code fence with border chars and language label', () => {
        const screen = render('```ts\nconst x = 1\n```', 40, 10);
        const rendered = screen.back.map(row => row.map(c => c.char).join('')).join('\n');
        expect(rendered).toContain('ts');
        expect(rendered).toContain('const x = 1');
        expect(rendered).toContain('┌');
        expect(rendered).toContain('└');
        expect(rendered).toContain('│');
        expect(rendered).not.toContain('```');
    });

    it('renders code fence with ASCII border chars when unicode is disabled', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const screen = render('```ts\nconst x = 1\n```', 40, 10);
        const rendered = screen.back.map(row => row.map(c => c.char).join('')).join('\n');
        expect(rendered).toContain('const x = 1');
        expect(rendered).toContain('+');
        expect(rendered).toContain('|');
        expect(rendered).not.toContain('┌');
    });

    it('wraps long paragraphs to fit width', () => {
        const screen = render('This is a very long paragraph that should wrap', 10, 10);
        const firstRow = screen.back[0].map(c => c.char).join('').trim();
        const secondRow = screen.back[1].map(c => c.char).join('').trim();
        expect(firstRow.length).toBeGreaterThan(0);
        expect(secondRow.length).toBeGreaterThan(0);
    });

    it('setContent updates content and marks the widget dirty', () => {
        const md = new Markdown({ content: 'old' });
        md.clearDirty();
        md.setContent('new');
        expect(md.getContent()).toBe('new');
        expect(md.isDirty).toBe(true);
    });

    it('getContent returns the current content', () => {
        const md = new Markdown({ content: 'hello' });
        expect(md.getContent()).toBe('hello');
        md.setContent('world');
        expect(md.getContent()).toBe('world');
    });

    it('renders empty string without error', () => {
        expect(() => render('', 20, 5)).not.toThrow();
    });
});
