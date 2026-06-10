import { describe, it, expect } from 'vitest';
import { type Style, Screen, parseColor, computeLayout } from '@termuijs/core';
import { Box } from './Box.js';
import { Highlight } from './Highlight.js';

function renderHighlight(
    query: string | RegExp,
    children: string,
    style?: Partial<Style>,
    width = 40,
    height = 1,
) {
    const root = new Box({ flexDirection: 'column', width: '100%', height: '100%' });
    const widget = new Highlight(children, query, style);
    widget.setStyle({ height: '100%' });
    root.addChild(widget);

    const screen = new Screen(width, height);
    const layout = root.getLayoutNode();
    computeLayout(layout, width, height);
    root.syncLayout();
    root.render(screen);
    return screen;
}

describe('Highlight Component', () => {
    it('No-op when query is empty/falsy', () => {
        const screen = renderHighlight('', 'hello world');
        expect(screen.back[0].map((cell) => cell.char).join('').trimEnd()).toBe('hello world');
    });

    it('String query highlights matching segments', () => {
        const screen = renderHighlight('test', 'this is a test text');
        expect(screen.back[0].map((cell) => cell.char).join('').trimEnd()).toBe('this is a test text');
        expect(screen.back[0][10].bg?.type).toBe('named');
        expect(screen.back[0][10].bg?.name).toBe('yellow');
    });

    it('RegExp query highlights matching segments', () => {
        const screen = renderHighlight(/TeSt/i, 'this is a test text');
        expect(screen.back[0].map((cell) => cell.char).join('').trimEnd()).toBe('this is a test text');
        expect(screen.back[0][10].bg?.name).toBe('yellow');
    });

    it('Custom style prop is applied to matched segments', () => {
        const screen = renderHighlight(
            'text',
            'this is a test text',
            { bg: parseColor('cyan'), fg: parseColor('black') },
            40,
            1,
        );
        expect(screen.back[0].map((cell) => cell.char).join('').trimEnd()).toBe('this is a test text');
        expect(screen.back[0][15].bg?.name).toBe('cyan');
    });
});
