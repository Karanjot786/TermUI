// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for NotificationCenter
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { NotificationCenter, NotificationStore } from './NotificationCenter.js';

function renderCenter(center: NotificationCenter): string {
    const screen = new Screen(24, 6);
    center.updateRect({ x: 0, y: 0, width: 24, height: 6 });
    center.render(screen);
    return screen.back.map((row) => row.map((cell) => cell.char).join('')).join('\n');
}

describe('NotificationCenter', () => {
    beforeEach(() => {
        NotificationStore.getInstance().dismissAll();
    });

    afterEach(() => {
        NotificationStore.getInstance().dismissAll();
        vi.restoreAllMocks();
    });

    it('has no notifications by default and renders nothing', () => {
        const center = new NotificationCenter({ width: 20 });
        const output = renderCenter(center);

        expect(output.trim()).toBe('');
    });

    it('push() adds notifications and subscriber callbacks receive updates', () => {
        const store = NotificationStore.getInstance();
        const received: string[] = [];
        const unsub = store.subscribe((notifications) => {
            received.push(notifications.map((n) => n.message).join(','));
        });

        const id1 = store.push('Hello', 'info');
        expect(store.notifications.map((n) => n.message)).toEqual(['Hello']);
        expect(received).toEqual(['Hello']);

        const id2 = store.push('World', 'success');
        expect(store.notifications.map((n) => n.message)).toEqual(['Hello', 'World']);
        expect(received).toEqual(['Hello', 'Hello,World']);

        store.dismiss(id1);
        expect(store.notifications.map((n) => n.message)).toEqual(['World']);
        expect(received).toEqual(['Hello', 'Hello,World', 'World']);

        store.dismissAll();
        expect(store.notifications).toEqual([]);
        expect(received).toEqual(['Hello', 'Hello,World', 'World', '']);

        unsub();
    });

    it('renders visible notifications and respects maxVisible', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const store = NotificationStore.getInstance();
        const center = new NotificationCenter({ width: 24, maxVisible: 2 });

        store.push('First', 'info');
        store.push('Second', 'success');
        store.push('Third', 'warning');

        const output = renderCenter(center);

        expect(output).toContain('+ Second');
        expect(output).toContain('! Third');
        expect(output).not.toContain('i First');
    });

    it('unmount() unsubscribes from the store', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const store = NotificationStore.getInstance();
        const center = new NotificationCenter({ width: 24 });

        store.push('Before', 'info');
        expect(renderCenter(center)).toContain('i Before');

        center.unmount();
        expect(renderCenter(center)).not.toContain('i Before');

        store.push('After', 'success');

        const output = renderCenter(center);
        expect(output).not.toContain('+ After');
    });
});
