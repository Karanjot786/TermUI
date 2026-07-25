import { describe, expect, it } from 'vitest';
import { createSnapshotHistory } from './snapshot-history.js';
import { createStore } from './store.js';

describe('createSnapshotHistory', () => {
    it('captures and restores store state', () => {
        const store = createStore(() => ({ count: 0, label: 'zero' }));
        const history = createSnapshotHistory(store);

        const initial = history.capture('initial');
        store.setState({ count: 2, label: 'two' });

        history.restore(initial.id);

        expect(store.getState()).toEqual({ count: 0, label: 'zero' });
    });

    it('supports undo and redo', () => {
        const store = createStore(() => ({ count: 0 }));
        const history = createSnapshotHistory(store);

        history.capture('zero');
        store.setState({ count: 1 });
        history.capture('one');

        expect(history.undo()?.state.count).toBe(0);
        expect(store.getState().count).toBe(0);
        expect(history.redo()?.state.count).toBe(1);
        expect(store.getState().count).toBe(1);
    });

    it('bounds snapshot history by limit', () => {
        const store = createStore(() => ({ count: 0 }));
        const history = createSnapshotHistory(store, { limit: 2 });

        history.capture('a');
        store.setState({ count: 1 });
        history.capture('b');
        store.setState({ count: 2 });
        history.capture('c');

        expect(history.list().map(snapshot => snapshot.label)).toEqual(['b', 'c']);
    });
    it('captures state that includes action functions without throwing', () => {
        // Regression test: state created via the (set) => ({...}) pattern
        // always includes action methods. structuredClone() throws on
        // functions, so capture() must strip them before cloning.
        const store = createStore((set) => ({
            count: 0,
            increment: () => set((s) => ({ count: s.count + 1 })),
        }));
        const history = createSnapshotHistory(store);

        expect(() => history.capture('initial')).not.toThrow();

        store.getState().increment();
        store.getState().increment();
        history.capture('after increments');

        history.undo();
        expect(store.getState().count).toBe(0);
        // action functions must survive a restore, not just data fields
        expect(typeof store.getState().increment).toBe('function');
    });

    it('restore() with an unknown id throws without moving the cursor', () => {
        const store = createStore(() => ({ count: 0 }));
        const history = createSnapshotHistory(store);

        history.capture('a');
        store.setState({ count: 1 });
        history.capture('b');

        expect(() => history.restore(9999)).toThrow(/Unknown store snapshot/);
        // cursor should be exactly where it was before the failed restore
        expect(history.undo()?.state.count).toBe(0);
    });

    it('capture() after undo() discards the redo branch', () => {
        const store = createStore(() => ({ count: 0 }));
        const history = createSnapshotHistory(store);

        history.capture('a');
        store.setState({ count: 1 });
        history.capture('b');
        history.undo();

        store.setState({ count: 99 });
        history.capture('c');

        expect(history.redo()).toBeNull();
    });

    it('clear() empties history without touching current state', () => {
        const store = createStore(() => ({ count: 0 }));
        const history = createSnapshotHistory(store);
        history.capture('a');
        store.setState({ count: 5 });
        history.capture('b');

        history.clear();

        expect(history.list()).toEqual([]);
        expect(history.undo()).toBeNull();
        expect(store.getState().count).toBe(5);
    });

    it('returns defensive copies — mutating a returned snapshot does not affect stored history', () => {
        const store = createStore(() => ({ nested: { count: 0 } }));
        const history = createSnapshotHistory(store);
        const snap = history.capture('a');

        (snap.state.nested as any).count = 999;

        expect(history.list()[0].state.nested.count).toBe(0);
    });
});
