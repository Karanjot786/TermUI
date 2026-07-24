import { describe, expect, it } from 'vitest';
import { Screen } from '@termuijs/core';
import { StatusBar, createApiStatusBar, formatApiStatusBar } from './StatusBar.js';

function renderStatusBar(statusBar: StatusBar, width = 60): string {
    const screen = new Screen(width, 1);
    statusBar.updateRect({ x: 0, y: 0, width, height: 1 });
    statusBar.render(screen);
    return screen.back[0].map((cell) => cell.char).join('');
}

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

    it('formats API status bar sections', () => {
        expect(formatApiStatusBar({
            method: 'post',
            endpoint: '/v1/chat',
            status: 201,
            latencyMs: 42.4,
            environment: 'prod',
            requestId: 'req_123',
        })).toEqual({
            left: 'POST /v1/chat',
            center: '201 OK',
            right: '42ms prod #req_123',
        });
    });

    it('creates a rendered API status bar helper', () => {
        const statusBar = createApiStatusBar({
            method: 'get',
            endpoint: '/health',
            status: 503,
            latencyMs: 1200,
        });

        const row = renderStatusBar(statusBar);

        expect(row).toContain('GET /health');
        expect(row).toContain('503 Server Error');
        expect(row).toContain('1200ms');
    });
});
