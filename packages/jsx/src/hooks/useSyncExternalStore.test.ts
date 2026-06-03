// ─────────────────────────────────────────────────────
// Tests — useSyncExternalStore hook
// ─────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    createFiber, setCurrentFiber, clearCurrentFiber,
    setRequestRender, runEffects, destroyFiber,
    type Fiber,
} from '../hooks.js';
import { useSyncExternalStore } from './useSyncExternalStore.js';

describe('useSyncExternalStore', () => {
    let fiber: Fiber;
    let renderCount = 0;

    beforeEach(() => {
        fiber = createFiber();
        renderCount = 0;
        setRequestRender(() => {
            renderCount++;
        });
        setCurrentFiber(fiber);
    });

    afterEach(() => {
        clearCurrentFiber();
    });

    it('returns getSnapshot() on the first render', () => {
        const getSnapshot = () => 'initial-value';
        const subscribe = () => () => {};

        const value = useSyncExternalStore(subscribe, getSnapshot);
        expect(value).toBe('initial-value');
    });

    it('re-renders when onStoreChange is called', async () => {
        let storeChangeHandler: (() => void) | null = null;
        let unsubscribeCalled = false;

        const subscribe = (onStoreChange: () => void) => {
            storeChangeHandler = onStoreChange;
            return () => {
                unsubscribeCalled = true;
            };
        };

        let snapshotValue = 'value-1';
        const getSnapshot = () => snapshotValue;

        // First render
        let value = useSyncExternalStore(subscribe, getSnapshot);
        expect(value).toBe('value-1');

        // Run effects to establish subscription
        runEffects(fiber);
        expect(storeChangeHandler).toBeDefined();

        // Change snapshot value and trigger change
        snapshotValue = 'value-2';
        storeChangeHandler!();

        // Wait for microtask queue to flush scheduled render
        await Promise.resolve();

        // Check that a render request was made
        expect(renderCount).toBe(1);

        // Simulate re-render pass
        fiber.hookIndex = 0;
        setCurrentFiber(fiber);
        value = useSyncExternalStore(subscribe, getSnapshot);
        expect(value).toBe('value-2');
    });

    it('calls the unsubscribe function returned by subscribe on unmount', () => {
        let unsubscribeCalled = false;

        const subscribe = () => {
            return () => {
                unsubscribeCalled = true;
            };
        };

        const getSnapshot = () => 'value';

        useSyncExternalStore(subscribe, getSnapshot);
        runEffects(fiber);

        expect(unsubscribeCalled).toBe(false);

        // Unmount component by destroying its fiber
        destroyFiber(fiber);

        expect(unsubscribeCalled).toBe(true);
    });

    it('a changed snapshot triggers a re-render', async () => {
        let storeChangeHandler: (() => void) | null = null;

        const subscribe = (onStoreChange: () => void) => {
            storeChangeHandler = onStoreChange;
            return () => {};
        };

        let snapshotValue = 'value-1';
        const getSnapshot = () => snapshotValue;

        // First render
        let value = useSyncExternalStore(subscribe, getSnapshot);
        expect(value).toBe('value-1');

        runEffects(fiber);

        // Case A: Trigger store change but value remains SAME (should not re-render)
        storeChangeHandler!();
        await Promise.resolve();
        expect(renderCount).toBe(0);

        // Case B: Trigger store change and value has CHANGED (should re-render)
        snapshotValue = 'value-2';
        storeChangeHandler!();
        await Promise.resolve();
        expect(renderCount).toBe(1);

        // Simulate re-render pass
        fiber.hookIndex = 0;
        setCurrentFiber(fiber);
        value = useSyncExternalStore(subscribe, getSnapshot);
        expect(value).toBe('value-2');
    });
});
