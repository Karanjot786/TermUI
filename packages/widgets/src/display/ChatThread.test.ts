import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { ChatThread } from './ChatThread.js';

function rowText(screen: Screen, row: number): string {
    let line = '';

    for (let col = 0; col < screen.cols; col++) {
        line += screen.back[row]?.[col]?.char ?? ' ';
    }

    return line;
}

describe('ChatThread', () => {

    it('assistant message aligns left', () => {
        const thread = new ChatThread();

        thread.addMessage({
            role: 'assistant',
            content: 'hello'
        });

        const screen = new Screen(60, 10);

        thread.updateRect({
            x: 0,
            y: 0,
            width: 60,
            height: 10
        });

        thread.render(screen);

        expect(rowText(screen, 0)).toContain('[Assistant]');
    });

    it('user message aligns right', () => {
        const thread = new ChatThread();

        thread.addMessage({
            role: 'user',
            content: 'hello'
        });

        const screen = new Screen(60, 10);

        thread.updateRect({
            x: 0,
            y: 0,
            width: 60,
            height: 10
        });

        thread.render(screen);

        const row = rowText(screen, 0);

        expect(row.indexOf('[User]')).toBeGreaterThan(10);
    });

    it('addMessage marks widget dirty', () => {
        const thread = new ChatThread();

        thread.clearDirty();

        expect(thread.isDirty).toBe(false);

        thread.addMessage({
            role: 'assistant',
            content: 'test'
        });

        expect(thread.isDirty).toBe(true);
    });

    it('auto-scrolls when new messages are added', () => {
        const thread = new ChatThread();

        thread.updateRect({
            x: 0,
            y: 0,
            width: 60,
            height: 2
        });

        for (let i = 0; i < 5; i++) {
            thread.addMessage({
                role: 'assistant',
                content: `msg${i}`
            });
        }

        thread.clearDirty();

        thread.addMessage({
            role: 'assistant',
            content: 'latest'
        });

        expect(thread.isDirty).toBe(true);
    });
});
