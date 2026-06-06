import { describe, it, expect } from 'vitest';
import { Screen, type KeyEvent } from '@termuijs/core';
import { ThinkingBlock } from './ThinkingBlock.js';

const key = (k: string): KeyEvent => ({ key: k, ctrl: false, alt: false, shift: false, raw: Buffer.alloc(0), stopPropagation: () => {}, preventDefault: () => {} });

function render(widget: ThinkingBlock) {
    const screen = new Screen(60, 10);
    widget.updateRect({ x: 0, y: 0, width: 60, height: 10 });
    widget.render(screen);
    return screen;
}

describe('ThinkingBlock', () => {
    it('renders collapsed state', () => {
        const block = new ThinkingBlock();

        const screen = render(block);

        expect(screen.back[0]?.[0]?.char).toBe('[');
    });

    it('expands on Enter', () => {
        const block = new ThinkingBlock();

        block.handleKey(key('enter'));

        const screen = render(block);

        const first = screen.back[0]?.[0]?.char;
        expect(['┌', '+']).toContain(first);
    });

    it('appendText updates content', () => {
        const block = new ThinkingBlock();

        block.appendText('Hello');
        block.handleKey(key('enter'));

        expect((block as any)._text).toContain('Hello');
    });

    it('shows streaming indicator', () => {
        const block = new ThinkingBlock();

        block.setStreaming(true);

        expect((block as any)._streaming).toBe(true);
    });
});
