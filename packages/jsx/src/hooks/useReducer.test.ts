// ─────────────────────────────────────────────────────
// Tests — useReducer hook
// ─────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    createFiber, setCurrentFiber, clearCurrentFiber,
    setRequestRender, useReducer,
    type Fiber,
} from '../hooks.js';

type CountAction = 'inc' | 'dec' | 'reset';

function countReducer(state: number, action: CountAction): number {
    if (action === 'inc') return state + 1;
    if (action === 'dec') return state - 1;
    if (action === 'reset') return 0;
    return state;
}

describe('useReducer', () => {
    let fiber: Fiber;

    beforeEach(() => {
        fiber = createFiber();
        setRequestRender(() => { });
        setCurrentFiber(fiber);
    });

    afterEach(() => {
        clearCurrentFiber();
    });

    it('returns the initial state on first render', () => {
        const [state] = useReducer(countReducer, 10);
        expect(state).toBe(10);
    });

    it('dispatch runs the reducer and updates state', () => {
        const [, dispatch] = useReducer(countReducer, 0);
        dispatch('inc');

        fiber.hookIndex = 0;
        const [state] = useReducer(countReducer, 0);
        expect(state).toBe(1);
    });

    it('multiple dispatches accumulate correctly', () => {
        const [, dispatch] = useReducer(countReducer, 0);
        dispatch('inc');
        dispatch('inc');
        dispatch('inc');

        fiber.hookIndex = 0;
        const [state] = useReducer(countReducer, 0);
        expect(state).toBe(3);
    });

    it('dec action reduces state', () => {
        const [, dispatch] = useReducer(countReducer, 5);
        dispatch('dec');

        fiber.hookIndex = 0;
        const [state] = useReducer(countReducer, 5);
        expect(state).toBe(4);
    });

    it('reset action returns state to 0', () => {
        const [, dispatch] = useReducer(countReducer, 42);
        dispatch('reset');

        fiber.hookIndex = 0;
        const [state] = useReducer(countReducer, 42);
        expect(state).toBe(0);
    });

    it('does not schedule a re-render when dispatch produces the same value', () => {
        const renders: number[] = [];
        setRequestRender(() => renders.push(1));

        // reducer that always returns the same state
        const [, dispatch] = useReducer((s: number, _a: null) => s, 5);
        dispatch(null);

        expect(renders.length).toBe(0);
    });

    it('works with object state', () => {
        type State = { name: string; age: number };
        type Action = { type: 'setName'; name: string } | { type: 'birthday' };

        function personReducer(state: State, action: Action): State {
            if (action.type === 'setName') return { ...state, name: action.name };
            if (action.type === 'birthday') return { ...state, age: state.age + 1 };
            return state;
        }

        const [, dispatch] = useReducer(personReducer, { name: 'Alice', age: 30 });
        dispatch({ type: 'birthday' });

        fiber.hookIndex = 0;
        const [state] = useReducer(personReducer, { name: 'Alice', age: 30 });
        expect(state.age).toBe(31);
        expect(state.name).toBe('Alice');
    });

    it('two independent fibers maintain separate state', () => {
        const [, dispatch1] = useReducer(countReducer, 0);
        clearCurrentFiber();

        const fiber2 = createFiber();
        setCurrentFiber(fiber2);
        const [, dispatch2] = useReducer(countReducer, 100);
        clearCurrentFiber();

        dispatch1('inc');
        dispatch2('dec');

        setCurrentFiber(fiber);
        fiber.hookIndex = 0;
        const [state1] = useReducer(countReducer, 0);
        clearCurrentFiber();

        setCurrentFiber(fiber2);
        fiber2.hookIndex = 0;
        const [state2] = useReducer(countReducer, 100);
        clearCurrentFiber();

        expect(state1).toBe(1);
        expect(state2).toBe(99);
    });
});
