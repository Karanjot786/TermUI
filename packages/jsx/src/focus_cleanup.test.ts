import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createFiber, setCurrentFiber, clearCurrentFiber, setRequestRender, runEffects, destroyFiber } from './hooks.js';
import { FocusContext } from './focus-context.js';
import { useFocus } from './hooks/useFocus.js';
import { autoBlurNode } from './focus_cleanup.js';

describe('focus cleanup & autoBlurNode', () => {
    let fiber = createFiber();
    let mockContextValue: {
        focused: string | null;
        focus: ReturnType<typeof vi.fn>;
        blur: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        fiber = createFiber();
        setRequestRender(() => {});
        setCurrentFiber(fiber);

        mockContextValue = {
            focused: null,
            focus: vi.fn((id: string) => {
                mockContextValue.focused = id;
            }),
            blur: vi.fn(() => {
                mockContextValue.focused = null;
            }),
        };

        fiber.contextValues.set(FocusContext._id, mockContextValue);
    });

    afterEach(() => {
        clearCurrentFiber();
        vi.restoreAllMocks();
    });

    it('clears focus on unmount if the unmounted node was focused', () => {
        mockContextValue.focused = 'my-id';
        useFocus({ id: 'my-id' });

        // Trigger mounting effects
        runEffects(fiber);

        // Simulate component unmount by destroying its fiber (which runs useEffect cleanups)
        destroyFiber(fiber);

        expect(mockContextValue.blur).toHaveBeenCalled();
    });

    it('does not clear focus on unmount if a different node is focused', () => {
        mockContextValue.focused = 'other-id';
        useFocus({ id: 'my-id' });
        runEffects(fiber);

        destroyFiber(fiber);

        expect(mockContextValue.blur).not.toHaveBeenCalled();
    });

    it('falls back to routing focus to fallback if ancestor exists or is first other', () => {
        // Setup global instances mock to test fallback routing
        const mockWidget1 = { id: 'child-id', focusable: true, parent: null };
        const mockWidget2 = { id: 'sibling-id', focusable: true, parent: null };
        mockWidget1.parent = null as any;

        const mockInstances = new Map();
        mockInstances.set(mockWidget1, { fiber: {} });
        mockInstances.set(mockWidget2, { fiber: {} });
        (globalThis as any).__termuijs_instances = mockInstances;

        mockContextValue.focused = 'child-id';

        autoBlurNode(mockContextValue as any, 'child-id');

        expect(mockContextValue.focus).toHaveBeenCalledWith('sibling-id');

        delete (globalThis as any).__termuijs_instances;
    });
});
