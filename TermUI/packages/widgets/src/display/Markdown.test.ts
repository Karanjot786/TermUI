import { describe, it, expect, vi } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { Markdown } from './Markdown.js';

describe('Markdown', () => {
    it('renders heading text with bold and underline', () => {
        const md = new Markdown({
            content: '# Hello'
        });

        const screen = new Screen(20, 5);

        md.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 5
        });

        md.render(screen);

        expect(screen.back[0][0].char).toBe('H');
        expect(screen.back[0][0].bold).toBe(true);
        expect(screen.back[0][0].underline).toBe(true);
    });
    it('setContent updates content', () => {
        const md = new Markdown({
            content: 'old'
        });

        md.setContent('new');

        expect(md.getContent()).toBe('new');
    });
    it('setContent marks widget dirty', () => {
        const md = new Markdown({
            content: 'old'
        });

        md.clearDirty();

        expect(md.isDirty).toBe(false);

        md.setContent('new');

        expect(md.isDirty).toBe(true);
    });
    it('renders list items', () => {
        const md = new Markdown({
            content: '- Item'
        });

        const screen = new Screen(20, 5);

        md.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 5
        });

        md.render(screen);

        const expected = caps.unicode ? '•' : '*';

        expect(screen.back[0][0].char).toBe(expected);
    });
    it('renders numbered list items', () => {
        const md = new Markdown({
            content: '1. First item'
        });

        const screen = new Screen(20, 5);

        md.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 5
        });

        md.render(screen);

        expect(screen.back[0][0].char).toBe('1');
        expect(screen.back[0][1].char).toBe('.');
    });
    it('wraps long paragraphs', () => {
        const md = new Markdown({
            content: 'This is a very long paragraph that should wrap'
        });

        const screen = new Screen(10, 5);

        md.updateRect({
            x: 0,
            y: 0,
            width: 10,
            height: 5
        });

        md.render(screen);

        const firstRow = screen.back[0].map(c => c.char).join('');
        const secondRow = screen.back[1].map(c => c.char).join('');

        expect(firstRow.trim().length).toBeGreaterThan(0);
        expect(secondRow.trim().length).toBeGreaterThan(0);
    });
    it('renders bold text', () => {
        const md = new Markdown({
            content: '**bold**'
        });

        const screen = new Screen(20, 5);

        md.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 5
        });

        md.render(screen);

        expect(screen.back[0][0].char).toBe('b');
        expect(screen.back[0][0].bold).toBe(true);
    });
    it('renders italic text', () => {
        const md = new Markdown({ content: '_italic_' });

        const screen = new Screen(20, 5);

        md.updateRect({ x: 0, y: 0, width: 20, height: 5 });
        md.render(screen);

        expect(screen.back[0][0].char).toBe('i');
        expect(screen.back[0][0].italic).toBe(true);
    });
    it('renders inline code', () => {
        const md = new Markdown({ content: '`code`' });

        const screen = new Screen(20, 5);

        md.updateRect({ x: 0, y: 0, width: 20, height: 5 });
        md.render(screen);

        expect(screen.back[0][0].char).toBe('c');
    });
   it('renders code block as a boxed block', () => {
    const md = new Markdown({
        content: '```ts\nconst x = 1\n```'
    });

    const screen = new Screen(40, 10);

    md.updateRect({
        x: 0,
        y: 0,
        width: 40,
        height: 10
    });

    md.render(screen);

    const rendered = screen.back
        .map(row => row.map(cell => cell.char).join(''))
        .join('\n');

    expect(rendered).toContain('const x = 1');
    expect(rendered).toContain('┌');
    expect(rendered).toContain('└');
    expect(rendered).toContain('│');
    expect(rendered).not.toContain('```');
    });

    it('renders code block with ASCII chars when NO_UNICODE=1', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();
        const { Screen } = await import('@termuijs/core');
        const { Markdown } = await import('./Markdown.js');

        const md = new Markdown({ content: '```ts\nconst x = 1\n```' });
        const screen = new Screen(40, 10);
        md.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        md.render(screen);

        const rendered = screen.back.map(row => row.map(c => c.char).join('')).join('\n');
        expect(rendered).toContain('const x = 1');
        expect(rendered).toContain('+');
        expect(rendered).toContain('|');
        expect(rendered).not.toContain('┌');

        vi.unstubAllEnvs();
    });
});
