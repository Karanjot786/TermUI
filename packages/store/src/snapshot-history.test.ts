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
});
