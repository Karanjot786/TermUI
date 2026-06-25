import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useEventListener } from './useEventListener.js';
// Import the internal fiber test harness directly from hooks.js
import { createFiber, setCurrentFiber, clearCurrentFiber, setRequestRender, runEffects, destroyFiber } from '../hooks.js';

describe('useEventListener', () => {
    let fiber: any;

    beforeEach(() => {
        fiber = createFiber();
        setCurrentFiber(fiber);
        setRequestRender(vi.fn());
    });

    afterEach(() => {
        if (fiber) {
            destroyFiber(fiber);
        }
        clearCurrentFiber();
    });

    it('no-ops gracefully when target is null', () => {
        const callback = vi.fn();
        useEventListener(null, 'test-event', callback);
        expect(() => runEffects(fiber)).not.toThrow();
    });

    it('adds listener on mount and removes on unmount', () => {
        const target = {
            on: vi.fn(),
            off: vi.fn(),
        };
        const callback = vi.fn();

        // Simulate Mount
        useEventListener(target, 'test-event', callback);
        runEffects(fiber);
        
        expect(target.on).toHaveBeenCalledTimes(1);
        expect(target.on).toHaveBeenCalledWith('test-event', expect.any(Function));
        expect(target.off).not.toHaveBeenCalled();

        // Simulate Unmount
        destroyFiber(fiber);
        fiber = null; // Prevent afterEach from attempting to double-destroy

        expect(target.off).toHaveBeenCalledTimes(1);
        expect(target.off).toHaveBeenCalledWith('test-event', expect.any(Function));
    });

    it('changing event removes the old listener and adds a new one', () => {
        const target = {
            on: vi.fn(),
            off: vi.fn(),
        };
        const callback = vi.fn();

        // 1. Initial Mount
        useEventListener(target, 'event-a', callback);
        runEffects(fiber);
        
        expect(target.on).toHaveBeenCalledWith('event-a', expect.any(Function));
        expect(target.off).not.toHaveBeenCalled();

        // 2. Simulate Re-render with new event name
        fiber.hookIndex = 0; // Reset hook index for re-render
        useEventListener(target, 'event-b', callback);
        runEffects(fiber);

        // Should have cleaned up 'event-a' and attached 'event-b'
        expect(target.off).toHaveBeenCalledWith('event-a', expect.any(Function));
        expect(target.on).toHaveBeenCalledWith('event-b', expect.any(Function));
    });
});