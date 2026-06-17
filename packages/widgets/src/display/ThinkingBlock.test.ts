import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, type KeyEvent, caps } from '@termuijs/core';
import { ThinkingBlock } from './ThinkingBlock.js';

const key = (k: string): KeyEvent => ({ key: k, ctrl: false, alt: false, shift: false, raw: Buffer.alloc(0), stopPropagation: () => {}, preventDefault: () => {} });

function render(widget: ThinkingBlock) {
    const screen = new Screen(60, 10);
    widget.updateRect({ x: 0, y: 0, width: 60, height: 10 });
    widget.render(screen);
    return screen;
}

afterEach(() => {
    vi.restoreAllMocks();
});

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

    it('uses ASCII borders when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const block = new ThinkingBlock();
        block.handleKey(key('enter')); // expand
        const screen = render(block);
        expect(screen.back[0]?.[0]?.char).toBe('+');
        expect(screen.back[0]?.[1]?.char).toBe('-');
        const secondRow = screen.back[1];
        expect(secondRow?.[0]?.char).toBe('|');
    });

    it('toggles back to collapsed state on repeated Enter presses', () => {
        const block = new ThinkingBlock();

        block.handleKey(key('enter'));
        block.handleKey(key('enter'));

        const screen = render(block);

        expect(screen.back[0]?.[0]?.char).toBe('[');
    });

    it('toggles when pressing t', () => {
        const block = new ThinkingBlock();

        block.handleKey(key('t'));

        const screen = render(block);

        expect(['┌', '+']).toContain(screen.back[0]?.[0]?.char);
    });

    it('ignores unsupported keys', () => {
        const block = new ThinkingBlock();

        block.handleKey(key('escape'));

        const screen = render(block);

        expect(screen.back[0]?.[0]?.char).toBe('[');
    });

    it('marks dirty after appendText', () => {
        const block = new ThinkingBlock();

        block.clearDirty();

        block.appendText('Hello');

        expect(block.isDirty).toBe(true);
    });

    it('marks dirty after setStreaming', () => {
        const block = new ThinkingBlock();

        block.clearDirty();

        block.setStreaming(true);

        expect(block.isDirty).toBe(true);
    });

    it('renders multiline content when expanded', () => {
        const block = new ThinkingBlock({
            thinking: 'Line 1\nLine 2',
        });

        block.handleKey(key('enter'));

        const screen = render(block);

        const output = screen.back
            .map(row => row.map(c => c.char).join(''))
            .join('\n');

        expect(output).toContain('Line 1');
        expect(output).toContain('Line 2');
    });

    it('toggles back to collapsed state when pressing t twice', () => {
        const block = new ThinkingBlock();

        block.handleKey(key('t'));
        block.handleKey(key('t'));

        const screen = render(block);

        expect(screen.back[0]?.[0]?.char).toBe('[');
    });

});
