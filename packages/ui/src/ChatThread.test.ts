import { describe, it, expect } from 'vitest';
import { ChatThread } from './ChatThread.js';
import { Screen, computeLayout } from '@termuijs/core';
import { Text } from '@termuijs/widgets';

describe('ChatThread', () => {
    it('initializes empty', () => {
        const thread = new ChatThread();
        expect(thread.messages.length).toBe(0);
    });

    it('adds message and clears them', () => {
        const thread = new ChatThread();
        thread.addMessage({ role: 'user', content: 'hello world' });
        expect(thread.messages.length).toBe(1);

        thread.clear();
        expect(thread.messages.length).toBe(0);
    });

    it('supports custom thread widgets', () => {
        const thread = new ChatThread();
        const customText = new Text('custom thread item');
        thread.addThreadWidget(customText);

        thread.removeThreadWidget(customText);
    });

    it('renders added messages to screen', () => {
        const screen = new Screen(60, 15);
        const thread = new ChatThread();
        thread.addMessage({ role: 'user', content: 'test message' });

        const node = thread.getLayoutNode();
        computeLayout(node, 60, 15);
        thread.syncLayout();
        thread.render(screen);

        const lines = screen.back.map((row) => row.map((cell) => cell.char).join(''));
        const joined = lines.join('\n');
        expect(joined).toContain('[User]');
        expect(joined).toContain('test message');
    });
});
