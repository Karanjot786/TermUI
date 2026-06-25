// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for NotificationCenter
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';

vi.mock('@termuijs/jsx', async () => {
    const actual = await vi.importActual<typeof import('@termuijs/jsx')>('@termuijs/jsx');
    const hooks = await vi.importActual<any>('../../jsx/src/hooks.js');
    return { ...actual, ...hooks };
});

import * as jsxRuntime from '@termuijs/jsx';
import { NotificationCenter, NotificationStore, useNotifications } from './NotificationCenter.js';

type Fiber = any;

const {
    createFiber,
    setCurrentFiber,
    clearCurrentFiber,
    runEffects,
    destroyFiber,
    setRequestRender,
} = jsxRuntime as any;

function renderCenter(
    center: NotificationCenter,
    width = 24,
    height = 6,
    rect = { x: 0, y: 0, width, height },
): string {
    const screen = new Screen(width, height);
    center.updateRect(rect);
    center.render(screen);
    return screen.back.map((row) => row.map((cell) => cell.char).join('')).join('\n');
}

function renderLines(
    center: NotificationCenter,
    width = 24,
    height = 6,
    rect = { x: 0, y: 0, width, height },
): string[] {
    return renderCenter(center, width, height, rect).split('\n');
}

function setupHook() {
    const fiber = createFiber();
    setCurrentFiber(fiber);
    const hook = useNotifications();
    clearCurrentFiber();
    runEffects(fiber);
    return { fiber, hook };
}

function rerenderHook(fiber: Fiber) {
    setCurrentFiber(fiber);
    const hook = useNotifications();
    clearCurrentFiber();
    runEffects(fiber);
    return hook;
}

describe('NotificationStore', () => {
    let store: NotificationStore;

    beforeEach(() => {
        vi.useFakeTimers();
        store = NotificationStore.getInstance();
        store.reset();
    });

    afterEach(() => {
        store.reset();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('push() returns unique string ids and preserves notification fields in insertion order', () => {
        vi.setSystemTime(new Date('2026-01-02T03:04:05.000Z'));

        const id1 = store.push('One', 'info');
        vi.advanceTimersByTime(12);
        const id2 = store.push('Two', 'success', 5000);

        expect(typeof id1).toBe('string');
        expect(typeof id2).toBe('string');
        expect(id1).not.toBe(id2);
        expect(store.notifications.map((n) => n.id)).toEqual([id1, id2]);
        expect(store.notifications.map((n) => n.message)).toEqual(['One', 'Two']);
        expect(store.notifications[0].createdAt).toBe(new Date('2026-01-02T03:04:05.000Z').getTime());
        expect(store.notifications[1].createdAt).toBe(new Date('2026-01-02T03:04:05.012Z').getTime());
        expect(store.notifications[1].durationMs).toBe(5000);
    });

    it('auto-dismisses timed notifications and notifies subscribers', () => {
        const updates: string[][] = [];
        store.subscribe((notifications) => updates.push(notifications.map((n) => n.message)));

        store.push('Timed', 'info', 1000);
        expect(store.notifications.map((n) => n.message)).toEqual(['Timed']);

        vi.advanceTimersByTime(999);
        expect(store.notifications.map((n) => n.message)).toEqual(['Timed']);

        vi.advanceTimersByTime(1);
        expect(store.notifications).toEqual([]);
        expect(updates).toEqual([['Timed'], []]);
    });

    it('dismisses multiple timed notifications independently', () => {
        store.push('Fast', 'info', 100);
        store.push('Slow', 'warning', 250);

        vi.advanceTimersByTime(100);
        expect(store.notifications.map((n) => n.message)).toEqual(['Slow']);

        vi.advanceTimersByTime(149);
        expect(store.notifications.map((n) => n.message)).toEqual(['Slow']);

        vi.advanceTimersByTime(1);
        expect(store.notifications).toEqual([]);
    });

    it('does not schedule auto-dismiss for durationMs 0 or undefined', () => {
        store.push('Zero', 'info', 0);
        store.push('Forever', 'success');

        vi.runAllTimers();
        expect(store.notifications.map((n) => n.message)).toEqual(['Zero', 'Forever']);
    });

    it('dismiss() ignores unknown and already dismissed ids without emitting updates', () => {
        const subscriber = vi.fn();
        store.subscribe(subscriber);

        store.dismiss('missing-id');
        expect(subscriber).not.toHaveBeenCalled();

        const id = store.push('Present', 'info');
        expect(subscriber).toHaveBeenCalledTimes(1);

        store.dismiss(id);
        expect(subscriber).toHaveBeenCalledTimes(2);

        store.dismiss(id);
        expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it('dismissAll() emits only when notifications exist and clears everything', () => {
        const subscriber = vi.fn();
        store.subscribe(subscriber);

        store.dismissAll();
        expect(subscriber).not.toHaveBeenCalled();

        store.push('One');
        store.push('Two');
        subscriber.mockClear();

        store.dismissAll();
        expect(subscriber).toHaveBeenCalledTimes(1);
        expect(store.notifications).toEqual([]);

        store.dismissAll();
        expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('subscribe() supports multiple listeners and independent unsubscription', () => {
        const first = vi.fn();
        const second = vi.fn();
        const unsubFirst = store.subscribe(first);
        store.subscribe(second);

        store.push('One');
        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1);

        unsubFirst();
        store.push('Two');
        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(2);
    });

    it('reset() clears notifications, removes subscribers, and allows new notifications', () => {
        const subscriber = vi.fn();
        store.subscribe(subscriber);
        store.push('Before');
        expect(subscriber).toHaveBeenCalledTimes(1);

        store.reset();
        expect(store.notifications).toEqual([]);

        store.push('After');
        expect(store.notifications.map((n) => n.message)).toEqual(['After']);
        expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('handles push, dismiss, and push sequences', () => {
        const first = store.push('First');
        store.dismiss(first);
        const second = store.push('Second');

        expect(store.notifications.map((n) => n.id)).toEqual([second]);
        expect(store.notifications.map((n) => n.message)).toEqual(['Second']);
    });
});

describe('NotificationCenter rendering and lifecycle', () => {
    let store: NotificationStore;

    beforeEach(() => {
        store = NotificationStore.getInstance();
        store.reset();
    });

    afterEach(() => {
        store.reset();
        vi.restoreAllMocks();
    });

    it('has no notifications by default and renders nothing', () => {
        const center = new NotificationCenter({ width: 20 });

        expect(renderCenter(center).trim()).toBe('');
    });

    it('renders info, success, warning, and error notifications with ASCII icons', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const center = new NotificationCenter({ width: 24, maxVisible: 4 });

        store.push('Info', 'info');
        store.push('Success', 'success');
        store.push('Warning', 'warning');
        store.push('Error', 'error');

        const output = renderCenter(center);
        expect(output).toContain('i Info');
        expect(output).toContain('+ Success');
        expect(output).toContain('! Warning');
        expect(output).toContain('x Error');
    });

    it('uses Unicode icons when supported', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const center = new NotificationCenter({ width: 24, maxVisible: 4 });

        store.push('Info', 'info');
        store.push('Success', 'success');
        store.push('Warning', 'warning');
        store.push('Error', 'error');

        const output = renderCenter(center);
        expect(output).toContain('ℹ Info');
        expect(output).toContain('✓ Success');
        expect(output).toContain('⚠ Warning');
        expect(output).toContain('✗ Error');
    });

    it('truncates notification text safely to available width', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const center = new NotificationCenter({ width: 40 });

        store.push('abcdefghijklmnopqrstuvwxyz', 'info');

        const lines = renderLines(center, 12, 4, { x: 0, y: 0, width: 12, height: 4 });
        expect(lines[1]).toContain(' i abcdef');
        expect(lines.join('\n')).not.toContain('klmnopqrstuvwxyz');
    });

    it.each([
        ['top-left', 1, 1],
        ['top-right', 21, 1],
        ['bottom-left', 1, 4],
        ['bottom-right', 21, 4],
    ] as const)('renders %s in the expected screen region', (position, expectedX, expectedY) => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const center = new NotificationCenter({ position, width: 8 });

        store.push('A', 'info');

        const lines = renderLines(center, 30, 6);
        expect(lines[expectedY].indexOf('i A')).toBe(expectedX + 1);
    });

    it('renders narrow, tiny, and large widths safely', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        store.push('Complete', 'info');

        const narrow = new NotificationCenter({ width: 3 });
        expect(renderCenter(narrow, 5, 3, { x: 0, y: 0, width: 5, height: 3 })).toContain(' i ');

        const tiny = new NotificationCenter({ width: 20 });
        expect(renderCenter(tiny, 2, 3, { x: 0, y: 0, width: 2, height: 3 }).trim()).toBe('');

        const large = new NotificationCenter({ width: 30 });
        expect(renderCenter(large, 40, 3, { x: 0, y: 0, width: 40, height: 3 })).toContain('i Complete');
    });

    it('respects maxVisible values including zero and counts above the notification count', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        store.push('Old', 'info');
        store.push('New', 'success');

        expect(renderCenter(new NotificationCenter({ width: 24, maxVisible: 1 }))).not.toContain('i Old');
        expect(renderCenter(new NotificationCenter({ width: 24, maxVisible: 1 }))).toContain('+ New');

        const allOutput = renderCenter(new NotificationCenter({ width: 24, maxVisible: 5 }));
        expect(allOutput).toContain('i Old');
        expect(allOutput).toContain('+ New');

        expect(renderCenter(new NotificationCenter({ width: 24, maxVisible: 0 })).trim()).toBe('');
    });

    it('constructor subscribes to the store and updates internal render state', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const center = new NotificationCenter({ width: 24 });

        expect(renderCenter(center).trim()).toBe('');

        store.push('After construction', 'success');
        expect(renderCenter(center)).toContain('+ After construction');
    });

    it('unmount() clears state, is idempotent, and ignores later store updates', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const center = new NotificationCenter({ width: 24 });

        store.push('Before', 'info');
        expect(renderCenter(center)).toContain('i Before');

        center.unmount();
        center.unmount();
        expect(renderCenter(center)).not.toContain('i Before');

        store.push('After', 'success');
        expect(renderCenter(center)).not.toContain('+ After');
    });

    it('destroy() cleans up store subscription and ignores later store updates', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const center = new NotificationCenter({ width: 24 });

        store.push('Before', 'info');
        expect(renderCenter(center)).toContain('i Before');

        center.destroy();
        expect(renderCenter(center)).not.toContain('i Before');

        store.push('After', 'success');
        expect(renderCenter(center)).not.toContain('+ After');
    });

    it('destroy() is safe to call multiple times', () => {
        const center = new NotificationCenter({ width: 24 });
        center.destroy();
        center.destroy();
        // No error thrown
    });

    it('destroy() stops store callbacks from firing on the widget', () => {
        const center = new NotificationCenter({ width: 24 });
        const markDirtySpy = vi.spyOn(center, 'markDirty');

        center.destroy();
        markDirtySpy.mockClear();

        store.push('After destroy', 'info');
        expect(markDirtySpy).not.toHaveBeenCalled();
    });

    it('renders safely for zero-sized screens, empty messages, many notifications, and long messages', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const center = new NotificationCenter({ width: 80, maxVisible: 100 });

        store.push('', 'info');
        for (let i = 0; i < 50; i++) {
            store.push(`M${i} ${'x'.repeat(200)}`, 'warning');
        }

        expect(() => renderCenter(center, 0, 0, { x: 0, y: 0, width: 0, height: 0 })).not.toThrow();

        const lines = renderLines(center, 20, 4, { x: 0, y: 0, width: 20, height: 4 });
        expect(lines).toHaveLength(4);
        expect(lines.some((line) => line.includes('M49'))).toBe(true);
        expect(lines.every((line) => line.length <= 20)).toBe(true);
    });
});

describe('useNotifications', () => {
    let store: NotificationStore;

    beforeEach(() => {
        store = NotificationStore.getInstance();
        store.reset();
        setRequestRender(() => {});
    });

    afterEach(() => {
        store.reset();
        setRequestRender(null);
        clearCurrentFiber();
        vi.restoreAllMocks();
    });

    it('delegates push(), dismiss(), and dismissAll() to the store', () => {
        const pushSpy = vi.spyOn(store, 'push');
        const dismissSpy = vi.spyOn(store, 'dismiss');
        const dismissAllSpy = vi.spyOn(store, 'dismissAll');
        const { fiber, hook } = setupHook();

        const id = hook.push('Hooked', 'success', 1000);
        hook.dismiss(id);
        hook.dismissAll();

        expect(pushSpy).toHaveBeenCalledWith('Hooked', 'success', 1000);
        expect(dismissSpy).toHaveBeenCalledWith(id);
        expect(dismissAllSpy).toHaveBeenCalled();

        destroyFiber(fiber);
    });

    it('receives store updates and keeps state synchronized across renders', () => {
        const { fiber, hook } = setupHook();
        expect(hook.notifications).toEqual([]);

        const id = hook.push('One', 'info');
        let updated = rerenderHook(fiber);
        expect(updated.notifications.map((n) => n.message)).toEqual(['One']);

        store.push('Two', 'warning');
        updated = rerenderHook(fiber);
        expect(updated.notifications.map((n) => n.message)).toEqual(['One', 'Two']);

        updated.dismiss(id);
        updated = rerenderHook(fiber);
        expect(updated.notifications.map((n) => n.message)).toEqual(['Two']);

        updated.dismissAll();
        updated = rerenderHook(fiber);
        expect(updated.notifications).toEqual([]);

        destroyFiber(fiber);
    });

    it('cleanup unsubscribes correctly', async () => {
        const requestRender = vi.fn();
        setRequestRender(requestRender);
        const { fiber } = setupHook();
        destroyFiber(fiber);

        store.push('After cleanup', 'info');
        await Promise.resolve();

        expect(requestRender).not.toHaveBeenCalled();
    });

    it('supports multiple hook subscribers attached simultaneously', () => {
        const first = setupHook();
        const second = setupHook();

        first.hook.push('Shared', 'success');

        expect(rerenderHook(first.fiber).notifications.map((n) => n.message)).toEqual(['Shared']);
        expect(rerenderHook(second.fiber).notifications.map((n) => n.message)).toEqual(['Shared']);

        destroyFiber(first.fiber);
        store.push('Still subscribed', 'warning');

        expect(rerenderHook(second.fiber).notifications.map((n) => n.message)).toEqual(['Shared', 'Still subscribed']);

        destroyFiber(second.fiber);
    });
});
