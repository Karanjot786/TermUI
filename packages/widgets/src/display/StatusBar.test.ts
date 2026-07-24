import { describe, expect, it } from 'vitest';
import { StatusBar } from './StatusBar.js';
import { Screen } from '@termuijs/core';

describe('StatusBar', () => {
    it('creates a StatusBar instance', () => {
        const statusBar = new StatusBar({}, {
            left: 'Ready',
            center: 'Dashboard',
            right: 'Ctrl+C Exit',
        });

        expect(statusBar).toBeDefined();
    });

    it('updates left section', () => {
        const statusBar = new StatusBar();

        statusBar.setLeft('Connected');

        expect(statusBar).toBeDefined();
    });

    it('updates center section', () => {
        const statusBar = new StatusBar();

        statusBar.setCenter('Workspace');

        expect(statusBar).toBeDefined();
    });

    it('updates right section', () => {
        const statusBar = new StatusBar();

        statusBar.setRight('F1 Help');

        expect(statusBar).toBeDefined();
    });

    it('clips sections before they can overlap on narrow widths', () => {
        const statusBar = new StatusBar({}, {
            left: 'LEFT-LONG',
            center: 'CENTER',
            right: 'RIGHT',
        });
        const screen = new Screen(12, 1);
        const writes: Array<{ x: number; text: string }> = [];
        const originalWriteString = screen.writeString.bind(screen);
        screen.writeString = ((x, y, text, attrs) => {
            writes.push({ x, text });
            return originalWriteString(x, y, text, attrs);
        }) as typeof screen.writeString;

        statusBar.updateRect({ x: 0, y: 0, width: 12, height: 1 });
        statusBar.render(screen);

        for (let i = 1; i < writes.length; i++) {
            const previous = writes[i - 1];
            const current = writes[i];
            expect(previous.x + previous.text.length).toBeLessThanOrEqual(current.x);
        }
        expect(writes.at(-1)).toEqual({ x: 7, text: 'RIGHT' });
    });
});
