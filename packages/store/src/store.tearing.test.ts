import { describe, it, expect, vi } from 'vitest';

const { mockUseState, mockUseEffect, mockUseRef } = vi.hoisted(() => ({
    mockUseState: vi.fn(),
    mockUseEffect: vi.fn(),
    mockUseRef: vi.fn()
}));

vi.mock('@termuijs/jsx', () => ({
    useState: mockUseState,
    useEffect: mockUseEffect,
    useRef: mockUseRef,
}));

import { createStore } from './store.js';

describe('useStore tearing protection', () => {
    it('forces an immediate re-render if state mutated before effect mounted', () => {
        const useStore = createStore({ count: 0 });

        let effectCb: () => void;
        let selectedState = 0;
        const setSelectedState = vi.fn();

        // Mock useState to return our initial state and setter
        mockUseState.mockImplementation((initFn) => {
            selectedState = initFn();
            return [selectedState, setSelectedState];
        });

        // Mock useRef to act like a real ref (returning a new object each time isn't quite right for multiple renders, but fine for a single render test)
        let refCalls = 0;
        let refs = [{}, {}];
        mockUseRef.mockImplementation((initial) => {
            const ref = refs[refCalls++];
            (ref as any).current = initial;
            return ref;
        });

        // Mock useEffect to capture the callback so we can run it later (simulating mount)
        mockUseEffect.mockImplementation((cb) => {
            effectCb = cb;
        });

        // 1. Initial Render Phase
        useStore((s: any) => s.count);

        // 2. Before effect runs (simulating tearing window), state updates!
        useStore.setState({ count: 99 });

        // 3. Effect Phase (React finally runs the useEffect)
        // This is where the tearing check should fire
        effectCb!();

        // 4. Assert: the effect MUST have detected the mismatch and called setSelectedState(99)
        expect(setSelectedState).toHaveBeenCalledWith(99);
    });
});
