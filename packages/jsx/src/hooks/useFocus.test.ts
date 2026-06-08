import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createFiber, setCurrentFiber, clearCurrentFiber, setRequestRender, runEffects } from '../hooks.js';
import { FocusContext } from '../focus-context.js';
import { useFocus } from './useFocus.js';

describe('useFocus', () => {
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

        // Inject the mock FocusContext value directly into the active fiber
        fiber.contextValues.set(FocusContext._id, mockContextValue);
    });

    afterEach(() => {
        clearCurrentFiber();
        vi.restoreAllMocks();
    });

    it('returns isFocused as false if another ID is focused', () => {
        mockContextValue.focused = 'other-id';
        const result = useFocus({ id: 'my-id' });
        expect(result.isFocused).toBe(false);
    });

    it('returns isFocused as true if its ID is focused', () => {
        mockContextValue.focused = 'my-id';
        const result = useFocus({ id: 'my-id' });
        expect(result.isFocused).toBe(true);
    });

    it('focus() calls context focus with correct ID', () => {
        const result = useFocus({ id: 'my-id' });
        result.focus();
        expect(mockContextValue.focus).toHaveBeenCalledWith('my-id');
    });

    it('blur() calls context blur', () => {
        const result = useFocus({ id: 'my-id' });
        result.blur();
        expect(mockContextValue.blur).toHaveBeenCalled();
    });

    it('autoFocuses on mount if focused is null', () => {
        mockContextValue.focused = null;
        
        useFocus({ id: 'my-id', autoFocus: true });
        
        // Trigger mounting effects
        runEffects(fiber);

        expect(mockContextValue.focus).toHaveBeenCalledWith('my-id');
    });

    it('does not autoFocus on mount if another element is already focused', () => {
        mockContextValue.focused = 'other-id';

        useFocus({ id: 'my-id', autoFocus: true });
        runEffects(fiber);

        expect(mockContextValue.focus).not.toHaveBeenCalled();
    });
});
