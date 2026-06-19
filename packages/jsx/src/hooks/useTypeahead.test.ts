import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTypeahead } from './useTypeahead.js';
import { createFiber, setCurrentFiber, clearCurrentFiber, setRequestRender, runEffects, destroyFiber } from '../hooks.js';

// Recreate the virtual clock behavior using Vitest's native timers
// so we don't need to depend on external unlinked test packages
function createVirtualClock() {
    vi.useFakeTimers();
    return {
        advance: (ms: number) => vi.advanceTimersByTime(ms),
        restore: () => vi.useRealTimers()
    };
}

// Intercept useInput to manually trigger keyboard events
const inputHandlers: any[] = [];
vi.mock('../index.js', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        useInput: (cb: any) => {
            inputHandlers.push(cb);
        }
    };
});

describe('useTypeahead', () => {
    let fiber: any;
    let clock: ReturnType<typeof createVirtualClock>;

    const items = ['apple', 'banana', 'cherry', 'blueberry'];
    const getItemLabel = (item: string) => item;

    beforeEach(() => {
        inputHandlers.length = 0;
        
        fiber = createFiber();
        setCurrentFiber(fiber);
        setRequestRender(vi.fn());
        
        clock = createVirtualClock();
    });

    afterEach(() => {
        if (fiber) destroyFiber(fiber);
        clearCurrentFiber();
        if (clock.restore) clock.restore();
        vi.clearAllMocks();
    });

    // Helper to simulate rendering the hook
    function renderHook(list = items) {
        fiber.hookIndex = 0;
        const result = useTypeahead(list, getItemLabel, 500);
        runEffects(fiber);
        return result;
    }

    // Helper to simulate user typing
    function triggerInput(key: string) {
        inputHandlers.forEach(handler => {
            handler({ key, ctrl: false, alt: false });
        });
    }

    it('Initial state returns -1 when no input has occurred', () => {
        const index = renderHook();
        expect(index).toBe(-1);
    });

    it('Single-character search', () => {
        let index = renderHook();
        triggerInput('b');
        index = renderHook();
        expect(index).toBe(1); // 'banana'
    });

    it('Multi-character accumulation', () => {
        renderHook();
        triggerInput('b');
        renderHook();
        triggerInput('l');
        const index = renderHook();
        expect(index).toBe(3); // 'blueberry'
    });

    it('Timeout reset', () => {
        renderHook();
        triggerInput('a');
        let index = renderHook();
        expect(index).toBe(0); // 'apple'

        // Advance time past the 500ms delay to clear the buffer
        clock.advance(600);
        
        triggerInput('b');
        index = renderHook();
        expect(index).toBe(1); // Matches 'banana', not 'ab'
    });

    it('Ignored mismatches (Invalid suffix protection)', () => {
        renderHook();
        triggerInput('a'); // buffer: a -> apple
        renderHook();
        
        triggerInput('x'); // buffer: ax -> no match -> ignored
        let index = renderHook();
        expect(index).toBe(0); // remains 'apple'

        triggerInput('p'); // buffer: ap -> apple
        index = renderHook();
        expect(index).toBe(0); // remains 'apple'
    });

    it('Empty list handling', () => {
        let index = renderHook([]);
        expect(index).toBe(-1);

        triggerInput('a');
        index = renderHook([]);
        expect(index).toBe(-1);
    });
});