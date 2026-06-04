import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDeferredValue } from './useDeferredValue.js';
import {
    createFiber, setCurrentFiber, clearCurrentFiber,
    setRequestRender, useState,
    type Fiber,
} from '../hooks.js';

describe('useDeferredValue', () => {
    let fiber: Fiber;
    let renderRequests = 0;

    beforeEach(() => {
        fiber = createFiber();
        renderRequests = 0;
        setRequestRender(() => { renderRequests++; });
        setCurrentFiber(fiber);
    });

    afterEach(() => {
        clearCurrentFiber();
    });

    // Helper to simulate a simple fiber render pass
    function renderPass(fn: () => void) {
        fiber.hookIndex = 0;
        setCurrentFiber(fiber);
        fn();
        clearCurrentFiber();
    }

    it('returns value synchronously on the first render', () => {
        let currentValue: string | undefined;

        renderPass(() => {
            currentValue = useDeferredValue('initial');
        });

        expect(currentValue).toBe('initial');
        expect(renderRequests).toBe(0);
    });

    it('when value changes, the hook returns the old value first, then the new value in the next render', async () => {
        let currentValue: string | undefined;
        let updateState: (val: string) => void = () => {};

        // 1. Initial Render
        renderPass(() => {
            const [val, setVal] = useState('initial');
            updateState = setVal;
            currentValue = useDeferredValue(val);
        });

        expect(currentValue).toBe('initial');

        // 2. Trigger parent state update
        updateState('updated');

        // 3. Next render pass (caused by parent update)
        renderPass(() => {
            const [val] = useState('initial'); // val is now 'updated'
            currentValue = useDeferredValue(val); 
        });

        // The deferred value should STILL be 'initial' on this pass
        expect(currentValue).toBe('initial');

        // Allow the Promise.resolve microtask to run and call setDeferredValue
        await Promise.resolve();

        // 4. Final render pass (triggered by the deferred state update)
        renderPass(() => {
            const [val] = useState('initial');
            currentValue = useDeferredValue(val); 
        });

        expect(currentValue).toBe('updated');
    });

    it('the deferred update does not block the current render', async () => {
        let currentValue: string | undefined;
        let parentValue: string | undefined;
        let updateState: (val: string) => void = () => {};

        // Mount
        renderPass(() => {
            const [val, setVal] = useState('a');
            updateState = setVal;
            parentValue = val;
            currentValue = useDeferredValue(val);
        });

        // Trigger update
        updateState('b');

        // Intermediate render
        renderPass(() => {
            const [val] = useState('a');
            parentValue = val;
            currentValue = useDeferredValue(val);
        });

        // The parent successfully rendered 'b', but the deferred value didn't block it, 
        // yielding the old value 'a' so the render could finish fast.
        expect(parentValue).toBe('b');
        expect(currentValue).toBe('a');

        // Flush deferred update
        await Promise.resolve();

        // Final render
        renderPass(() => {
            const [val] = useState('a');
            parentValue = val;
            currentValue = useDeferredValue(val);
        });

        expect(parentValue).toBe('b');
        expect(currentValue).toBe('b');
    });
});