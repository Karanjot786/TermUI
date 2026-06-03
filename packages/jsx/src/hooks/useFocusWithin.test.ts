import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createFiber, setCurrentFiber, clearCurrentFiber, setRequestRender, type Fiber } from '../hooks.js';
import { FocusContext } from '../focus-context.js';
import { useFocusWithin } from './useFocusWithin.js';

describe('useFocusWithin', () => {
    let fiber: Fiber;

    beforeEach(() => {
        fiber = createFiber();
        setRequestRender(() => {});
        setCurrentFiber(fiber);
    });

    afterEach(() => {
        clearCurrentFiber();
    });

    it('returns false when nothing is focused', () => {
        fiber.contextValues.set(FocusContext._id, {
            focused: null,
            focus: vi.fn(),
            blur: vi.fn(),
        });
        const isFocusedWithin = useFocusWithin({ ids: ['id1', 'id2'] });
        expect(isFocusedWithin).toBe(false);
    });

    it('returns true when the focused id is in ids', () => {
        fiber.contextValues.set(FocusContext._id, {
            focused: 'id1',
            focus: vi.fn(),
            blur: vi.fn(),
        });
        const isFocusedWithin = useFocusWithin({ ids: ['id1', 'id2'] });
        expect(isFocusedWithin).toBe(true);
    });

    it('returns false when the focused id is not in ids', () => {
        fiber.contextValues.set(FocusContext._id, {
            focused: 'id3',
            focus: vi.fn(),
            blur: vi.fn(),
        });
        const isFocusedWithin = useFocusWithin({ ids: ['id1', 'id2'] });
        expect(isFocusedWithin).toBe(false);
    });

    it('returns false when ids list is empty', () => {
        fiber.contextValues.set(FocusContext._id, {
            focused: 'id1',
            focus: vi.fn(),
            blur: vi.fn(),
        });
        const isFocusedWithin = useFocusWithin({ ids: [] });
        expect(isFocusedWithin).toBe(false);
    });

    it('updates when the focused id changes', () => {
        const mockContext = {
            focused: 'id1',
            focus: vi.fn(),
            blur: vi.fn(),
        };
        fiber.contextValues.set(FocusContext._id, mockContext);

        let isFocusedWithin = useFocusWithin({ ids: ['id1', 'id2'] });
        expect(isFocusedWithin).toBe(true);

        // Simulate context update
        mockContext.focused = 'id3';

        // Reset the hookIndex to simulate a rerender of the same component
        fiber.hookIndex = 0;
        isFocusedWithin = useFocusWithin({ ids: ['id1', 'id2'] });
        expect(isFocusedWithin).toBe(false);
    });
});
