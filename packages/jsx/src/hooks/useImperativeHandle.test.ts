import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    createFiber,
    setCurrentFiber,
    clearCurrentFiber,
    useImperativeHandle,
    type Fiber,
} from '../hooks.js';

interface Handle {
    value: string;
    focus: () => string;
}

describe('useImperativeHandle', () => {
    let fiber: Fiber;

    beforeEach(() => {
        fiber = createFiber();
        setCurrentFiber(fiber);
    });

    afterEach(() => {
        clearCurrentFiber();
    });

    it('sets ref.current to the object returned by createHandle', () => {
        const ref = { current: null as Handle | null };
        const handle = { value: 'first', focus: () => 'focused' };

        useImperativeHandle(ref, () => handle, []);

        expect(ref.current).toBe(handle);
        expect(ref.current?.focus()).toBe('focused');
    });

    it('does not rebuild the handle when deps are unchanged', () => {
        const ref = { current: null as Handle | null };
        const createHandle = vi.fn(() => ({ value: 'same', focus: () => 'same' }));

        useImperativeHandle(ref, createHandle, ['dep']);
        const firstHandle = ref.current;

        fiber.hookIndex = 0;
        setCurrentFiber(fiber);
        useImperativeHandle(ref, createHandle, ['dep']);

        expect(createHandle).toHaveBeenCalledOnce();
        expect(ref.current).toBe(firstHandle);
    });

    it('rebuilds the handle when a dep changes', () => {
        const ref = { current: null as Handle | null };
        let value = 'first';
        const createHandle = vi.fn(() => ({ value, focus: () => value }));

        useImperativeHandle(ref, createHandle, [value]);
        const firstHandle = ref.current;

        value = 'second';
        fiber.hookIndex = 0;
        setCurrentFiber(fiber);
        useImperativeHandle(ref, createHandle, [value]);

        expect(createHandle).toHaveBeenCalledTimes(2);
        expect(ref.current).not.toBe(firstHandle);
        expect(ref.current?.value).toBe('second');
    });

    it('does not throw with a null ref', () => {
        expect(() => {
            useImperativeHandle(null, () => ({ value: 'x' }), []);
        }).not.toThrow();
    });
});
