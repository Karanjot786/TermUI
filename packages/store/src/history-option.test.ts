import { describe, expect, it, vi } from 'vitest';
import { createStore, batch } from './store';

describe('createStore history option', () => {
    it('undo()/redo() round-trip a plain setState', () => {
        const store = createStore(() => ({ count: 0 }), { history: { limit: 50 } });
        store.setState({ count: 1 });
        store.setState({ count: 2 });

        store.undo();
        expect(store.getState().count).toBe(1);
        store.undo();
        expect(store.getState().count).toBe(0);
        store.redo();
        expect(store.getState().count).toBe(1);
    });

    it('batch() collapses to exactly one history entry', () => {
        const store = createStore((set) => ({
            count: 0,
            increment: () => set((s) => ({ count: s.count + 1 })),
        }), { history: { limit: 50 } });

        batch(() => {
            store.getState().increment();
            store.getState().increment();
            store.getState().increment();
        });

        expect(store.getHistory().past.length).toBe(1);
        store.undo();
        expect(store.getState().count).toBe(0);
    });

    it('undo() throws when history option is not set', () => {
        const store = createStore(() => ({ count: 0 }));
        expect(() => store.undo()).toThrow(/requires the "history" option/);
    });

    it('undo() throws when called inside batch()', () => {
        const store = createStore(() => ({ count: 0 }), { history: {} });
        expect(() => {
            batch(() => {
                store.undo();
            });
        }).toThrow(/cannot be called inside batch/);
    });

    it('coalesceMs merges updates that occur within the window (timestamp-based, not timer-based)', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const store = createStore(() => ({ n: 0 }), { history: { coalesceMs: 300 } });

        store.setState({ n: 1 });
        vi.setSystemTime(100); // still inside the 300ms window
        store.setState({ n: 2 });

        expect(store.getHistory().past.length).toBe(1);

        vi.setSystemTime(500); // window has elapsed
        store.setState({ n: 3 });
        expect(store.getHistory().past.length).toBe(2);

        vi.useRealTimers();
    });

    it('limit caps the past stack', () => {
        const store = createStore(() => ({ n: 0 }), { history: { limit: 3 } });
        for (let i = 1; i <= 5; i++) store.setState({ n: i });
        expect(store.getHistory().past.length).toBe(3);
    });

    it('resetHistory() clears both stacks without touching state', () => {
        const store = createStore(() => ({ n: 0 }), { history: {} });
        store.setState({ n: 1 });
        store.resetHistory();
        expect(store.getHistory()).toEqual({ past: [], future: [] });
        expect(store.getState().n).toBe(1);
    });
});