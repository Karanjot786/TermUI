// ─────────────────────────────────────────────────────
// @termuijs/jsx — Tests for useHistory hook
// ─────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createFiber, setCurrentFiber, clearCurrentFiber, setRequestRender } from '../hooks.js';
import { useHistory } from './useHistory.js';

describe('useHistory', () => {
    let fiber = createFiber();

    beforeEach(() => {
        fiber = createFiber();
        setRequestRender(() => {});
        setCurrentFiber(fiber);
    });

    afterEach(() => {
        clearCurrentFiber();
    });

    it('initializes with correct present state', () => {
        const [state, actions] = useHistory('first');
        expect(state).toBe('first');
        expect(actions.canUndo).toBe(false);
        expect(actions.canRedo).toBe(false);
        expect(actions.history.past).toEqual([]);
        expect(actions.history.future).toEqual([]);
    });

    it('updates state and past history when set is called', () => {
        const [, actions] = useHistory('first');
        actions.set('second');

        fiber.hookIndex = 0;
        const [nextState, nextActions] = useHistory('first');
        expect(nextState).toBe('second');
        expect(nextActions.canUndo).toBe(true);
        expect(nextActions.canRedo).toBe(false);
        expect(nextActions.history.past).toEqual(['first']);
    });

    it('supports undo operation', () => {
        const [, actions1] = useHistory('v1');
        actions1.set('v2');

        fiber.hookIndex = 0;
        const [, actions2] = useHistory('v1');
        actions2.set('v3');

        fiber.hookIndex = 0;
        const [, actions3] = useHistory('v1');
        actions3.undo();

        fiber.hookIndex = 0;
        const [undoneState, undoneActions] = useHistory('v1');
        expect(undoneState).toBe('v2');
        expect(undoneActions.canRedo).toBe(true);
    });

    it('supports redo operation', () => {
        const [, actions1] = useHistory('v1');
        actions1.set('v2');

        fiber.hookIndex = 0;
        const [, actions2] = useHistory('v1');
        actions2.undo();

        fiber.hookIndex = 0;
        const [, actions3] = useHistory('v1');
        actions3.redo();

        fiber.hookIndex = 0;
        const [redoneState] = useHistory('v1');
        expect(redoneState).toBe('v2');
    });

    it('clears history stacks when clear is called', () => {
        const [, actions1] = useHistory('v1');
        actions1.set('v2');

        fiber.hookIndex = 0;
        const [, actions2] = useHistory('v1');
        actions2.clear();

        fiber.hookIndex = 0;
        const [state, actions3] = useHistory('v1');
        expect(state).toBe('v2');
        expect(actions3.canUndo).toBe(false);
        expect(actions3.canRedo).toBe(false);
    });
});
