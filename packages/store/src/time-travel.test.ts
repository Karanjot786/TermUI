import { describe, it, expect } from 'vitest';
import { createStore } from './store.js';
import { createTimeTravel } from './time-travel.js';

interface TestState {
    count: number;
    text: string;
}

describe('TimeTravel Middleware & Snapshot Replay', () => {
    it('records store state mutations across dispatches', () => {
        const timeTravel = createTimeTravel<TestState>();

        const store = createStore<TestState>(
            { count: 0, text: 'initial' },
            { middleware: [timeTravel.middleware] }
        );
        timeTravel.bindStore(store);

        expect(timeTravel.history.length).toBe(1);
        expect(timeTravel.cursor).toBe(0);

        store.setState({ count: 1 });
        expect(timeTravel.history.length).toBe(2);
        expect(store.getState().count).toBe(1);

        store.setState({ count: 2, text: 'updated' });
        expect(timeTravel.history.length).toBe(3);
        expect(store.getState()).toEqual({ count: 2, text: 'updated' });
    });

    it('supports undo and redo functionality', () => {
        const timeTravel = createTimeTravel<TestState>();
        const store = createStore<TestState>(
            { count: 0, text: 'v0' },
            { middleware: [timeTravel.middleware] }
        );
        timeTravel.bindStore(store);

        store.setState({ count: 1, text: 'v1' });
        store.setState({ count: 2, text: 'v2' });

        expect(timeTravel.canUndo).toBe(true);
        expect(timeTravel.canRedo).toBe(false);

        // Undo to v1
        const undo1 = timeTravel.undo();
        expect(undo1).toBe(true);
        expect(store.getState()).toEqual({ count: 1, text: 'v1' });
        expect(timeTravel.canRedo).toBe(true);

        // Undo to v0
        const undo2 = timeTravel.undo();
        expect(undo2).toBe(true);
        expect(store.getState()).toEqual({ count: 0, text: 'v0' });
        expect(timeTravel.canUndo).toBe(false);

        // Redo to v1
        const redo1 = timeTravel.redo();
        expect(redo1).toBe(true);
        expect(store.getState()).toEqual({ count: 1, text: 'v1' });
    });

    it('supports jumping to specific history indices', () => {
        const timeTravel = createTimeTravel<TestState>();
        const store = createStore<TestState>(
            { count: 0, text: 'v0' },
            { middleware: [timeTravel.middleware] }
        );
        timeTravel.bindStore(store);

        store.setState({ count: 1, text: 'v1' });
        store.setState({ count: 2, text: 'v2' });
        store.setState({ count: 3, text: 'v3' });

        expect(timeTravel.jumpTo(0)).toBe(true);
        expect(store.getState().count).toBe(0);

        expect(timeTravel.jumpTo(2)).toBe(true);
        expect(store.getState().count).toBe(2);

        expect(timeTravel.jumpTo(99)).toBe(false);
    });

    it('truncates redo branch when a new state update occurs after undo', () => {
        const timeTravel = createTimeTravel<TestState>();
        const store = createStore<TestState>(
            { count: 0, text: 'v0' },
            { middleware: [timeTravel.middleware] }
        );
        timeTravel.bindStore(store);

        store.setState({ count: 1, text: 'v1' });
        store.setState({ count: 2, text: 'v2' });

        timeTravel.undo(); // back to v1
        expect(timeTravel.canRedo).toBe(true);

        // New dispatch branch
        store.setState({ count: 10, text: 'v10-branched' });
        expect(timeTravel.canRedo).toBe(false);
        expect(timeTravel.history.length).toBe(3);
        expect(store.getState().text).toBe('v10-branched');
    });

    it('exports and imports snapshots correctly', () => {
        const timeTravel1 = createTimeTravel<TestState>();
        const store1 = createStore<TestState>(
            { count: 0, text: 'v0' },
            { middleware: [timeTravel1.middleware] }
        );
        timeTravel1.bindStore(store1);

        store1.setState({ count: 5, text: 'saved' });

        const snapshotJson = timeTravel1.exportSnapshot();
        expect(typeof snapshotJson).toBe('string');

        const timeTravel2 = createTimeTravel<TestState>();
        const store2 = createStore<TestState>(
            { count: 0, text: 'initial' },
            { middleware: [timeTravel2.middleware] }
        );
        timeTravel2.bindStore(store2);

        timeTravel2.importSnapshot(snapshotJson);
        expect(store2.getState()).toEqual({ count: 5, text: 'saved' });
        expect(timeTravel2.history.length).toBe(2);
    });

    it('respects maxHistory depth limit', () => {
        const timeTravel = createTimeTravel<TestState>({ maxHistory: 3 });
        const store = createStore<TestState>(
            { count: 0, text: '0' },
            { middleware: [timeTravel.middleware] }
        );
        timeTravel.bindStore(store);

        store.setState({ count: 1, text: '1' });
        store.setState({ count: 2, text: '2' });
        store.setState({ count: 3, text: '3' });
        store.setState({ count: 4, text: '4' });

        expect(timeTravel.history.length).toBe(3);
        expect(store.getState().count).toBe(4);
    });
});
