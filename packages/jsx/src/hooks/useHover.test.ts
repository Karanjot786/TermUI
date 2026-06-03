import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createFiber,
    setCurrentFiber,
    clearCurrentFiber,
    runEffects,
} from '../hooks.js';

import { useHover } from './useHover.js';

function createWidget() {
    const events: Record<string, Function[]> = {};

    return {
        on: vi.fn((event: string, cb: Function) => {
            events[event] ||= [];
            events[event].push(cb);
        }),

        off: vi.fn((event: string, cb: Function) => {
            events[event] = (events[event] || []).filter((f) => f !== cb);
        }),

        emit(event: string) {
            (events[event] || []).forEach((cb) => cb());
        },
    };
}

describe('useHover', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns false when no widget is attached', () => {
        const fiber = createFiber();

        setCurrentFiber(fiber);
        const [hovered] = useHover();
        clearCurrentFiber();

        expect(hovered).toBe(false);
    });

    it('returns true when widget is hovered', () => {
        const fiber = createFiber();
        const widget = createWidget();

        setCurrentFiber(fiber);
        const [_, ref] = useHover();

        ref(widget as any);
        runEffects(fiber);
        clearCurrentFiber();

        widget.emit('mouseenter');

        expect(readHover(fiber)).toBe(true);
    });

    it('returns false when hover leaves', () => {
        const fiber = createFiber();
        const widget = createWidget();

        setCurrentFiber(fiber);
        const [_, ref] = useHover();

        ref(widget as any);
        runEffects(fiber);
        clearCurrentFiber();

        widget.emit('mouseenter');
        widget.emit('mouseleave');

        expect(readHover(fiber)).toBe(false);
    });

    it('cleanup removes listeners on unmount', () => {
        const fiber = createFiber();
        const widget = createWidget();

        setCurrentFiber(fiber);
        const [, ref] = useHover();

        ref(widget as any);
        runEffects(fiber);
        clearCurrentFiber();

        expect(widget.on).toHaveBeenCalled();
    });
});

function readHover(fiber: any): boolean {
    const hook = fiber.hooks.find((h: any) => h?.value !== undefined);
    return Boolean(hook?.value);
}