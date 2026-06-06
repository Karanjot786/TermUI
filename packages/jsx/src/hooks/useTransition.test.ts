import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    createFiber,
    setCurrentFiber,
    clearCurrentFiber,
    setRequestRender,
    useState,
    type Fiber,
} from '../hooks.js';
import { useTransition } from './useTransition.js';

describe('useTransition', () => {
    let fiber: Fiber;

    beforeEach(() => {
        fiber = createFiber();
        setRequestRender(() => {});
        setCurrentFiber(fiber);
    });

    afterEach(() => {
        clearCurrentFiber();
        setRequestRender(null);
        vi.restoreAllMocks();
    });

    it('isPending is false before startTransition is called', () => {
        const [isPending] = useTransition();

        expect(isPending).toBe(false);
    });

    it('isPending is true while the transition update is pending', () => {
        const [, startTransition] = useTransition();

        startTransition(() => {});

        fiber.hookIndex = 0;
        const [isPending] = useTransition();

        expect(isPending).toBe(true);
    });

    it('isPending returns to false once the update commits', async () => {
        const [, startTransition] = useTransition();

        startTransition(() => {});

        await Promise.resolve();

        fiber.hookIndex = 0;
        const [isPending] = useTransition();

        expect(isPending).toBe(false);
    });

    it('the state update inside startTransition does not block other renders', async () => {
        const requestRender = vi.fn();
        setRequestRender(requestRender);

        const [, startTransition] = useTransition();
        const [, setCount] = useState(0);

        startTransition(() => {
            setCount(1);
        });

        expect(requestRender).not.toHaveBeenCalled();

        await Promise.resolve();

        expect(requestRender).toHaveBeenCalled();
    });
});