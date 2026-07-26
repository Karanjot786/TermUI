import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    createFiber,
    setCurrentFiber,
    clearCurrentFiber,
    setRequestRender,
    destroyFiber,
    type Fiber,
} from '../hooks.js';
import { useConcurrentReducer, Priority } from './useConcurrentReducer.js';

interface TestState {
    count: number;
    lastAction?: string;
}

interface TestAction {
    type: string;
    payload?: number;
}

function testReducer(state: TestState, action: TestAction): TestState {
    switch (action.type) {
        case 'INCREMENT':
            return { ...state, count: state.count + (action.payload ?? 1), lastAction: action.type };
        case 'DECREMENT':
            return { ...state, count: state.count - (action.payload ?? 1), lastAction: action.type };
        default:
            return state;
    }
}

describe('useConcurrentReducer Hook', () => {
    let fiber: Fiber;

    beforeEach(() => {
        fiber = createFiber();
        setRequestRender(() => {});
    });

    afterEach(() => {
        clearCurrentFiber();
        destroyFiber(fiber);
    });

    it('processes Priority.Immediate actions synchronously', () => {
        setCurrentFiber(fiber);
        const [state, dispatch] = useConcurrentReducer(testReducer, { count: 0 });
        clearCurrentFiber();

        expect(state.count).toBe(0);

        // Immediate dispatch
        dispatch({ type: 'INCREMENT' }, Priority.Immediate);

        // Re-render fiber
        fiber.hookIndex = 0;
        setCurrentFiber(fiber);
        const [nextState] = useConcurrentReducer(testReducer, { count: 0 });
        clearCurrentFiber();

        expect(nextState.count).toBe(1);
        expect(nextState.lastAction).toBe('INCREMENT');
    });

    it('buffers Priority.Background actions and flushes them on queueMicrotask', async () => {
        setCurrentFiber(fiber);
        const [state, dispatch] = useConcurrentReducer(testReducer, { count: 10 });
        clearCurrentFiber();

        expect(state.count).toBe(10);

        // Background dispatch
        dispatch({ type: 'DECREMENT', payload: 3 }, Priority.Background);

        // Wait for microtask queue flush
        await new Promise((r) => queueMicrotask(r));

        // Re-render fiber
        fiber.hookIndex = 0;
        setCurrentFiber(fiber);
        const [nextState] = useConcurrentReducer(testReducer, { count: 10 });
        clearCurrentFiber();

        expect(nextState.count).toBe(7);
        expect(nextState.lastAction).toBe('DECREMENT');
    });

    it('executes middleware pipeline before applying action reduction', () => {
        const middlewareSpy = vi.fn((action, priority, next, state) => {
            if (action.type === 'INCREMENT') {
                next({ ...action, payload: 10 });
            } else {
                next(action);
            }
        });

        setCurrentFiber(fiber);
        const [state, dispatch] = useConcurrentReducer(testReducer, { count: 0 }, {
            middleware: [middlewareSpy],
        });
        clearCurrentFiber();

        dispatch({ type: 'INCREMENT', payload: 1 }, Priority.Immediate);

        expect(middlewareSpy).toHaveBeenCalledOnce();

        // Re-render fiber
        fiber.hookIndex = 0;
        setCurrentFiber(fiber);
        const [nextState] = useConcurrentReducer(testReducer, { count: 0 }, {
            middleware: [middlewareSpy],
        });
        clearCurrentFiber();

        expect(nextState.count).toBe(10); // Transformed by middleware from 1 to 10
    });
});
