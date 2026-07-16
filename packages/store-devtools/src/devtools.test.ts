import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from '@termuijs/store';
import { devtools, getDevToolsRegistry } from './devtools.js';

describe('Store DevTools', () => {
    beforeEach(() => {
        // Clear global registry before each test
        getDevToolsRegistry().stores.clear();
    });

    it('records state transitions and history correctly', () => {
        interface State {
            val: number;
            inc: () => void;
        }

        const devtoolsMw = devtools<State>({ name: 'counter' });
        const useStore = createStore<State>(
            (set) => ({
                val: 0,
                inc: () => set((s) => ({ val: s.val + 1 }), 'INCREMENT')
            }),
            { middleware: [devtoolsMw] }
        );

        const api = devtoolsMw.api;

        expect(api.history.present).toBeNull(); // Initial state is set on first run/update in devtools
        
        useStore.getState().inc();
        expect(api.history.present).toBeDefined();
        expect(api.history.present!.val).toBe(1);
        expect(api.history.past.length).toBe(1);
        expect(api.history.past[0].state).toBeDefined();
        expect(api.history.past[0].state!.val).toBe(0);
        expect(api.history.past[0].action.type).toBe('INCREMENT');

        useStore.getState().inc();
        expect(api.history.present!.val).toBe(2);
        expect(api.history.past.length).toBe(2);
        expect(api.history.past[1].state!.val).toBe(1);
    });

    it('handles time-travel (goTo) correctly', () => {
        interface State {
            val: number;
            inc: () => void;
        }

        const devtoolsMw = devtools<State>({ name: 'counter' });
        const useStore = createStore<State>(
            (set) => ({
                val: 0,
                inc: () => set((s) => ({ val: s.val + 1 }), 'INCREMENT')
            }),
            { middleware: [devtoolsMw] }
        );

        const api = devtoolsMw.api;

        useStore.getState().inc(); // val: 1
        useStore.getState().inc(); // val: 2

        expect(useStore.getState().val).toBe(2);

        // Travel back to index 1 (val: 1)
        api.goTo(1, useStore.setState);

        expect(useStore.getState().val).toBe(1);
        expect(api.history.present!.val).toBe(1);
        expect(api.history.past.length).toBe(1);
        expect(api.history.future.length).toBe(1);

        // Travel back to index 0 (val: 0)
        api.goTo(0, useStore.setState);
        expect(useStore.getState().val).toBe(0);
        expect(api.history.present!.val).toBe(0);
        expect(api.history.past.length).toBe(0);
        expect(api.history.future.length).toBe(2);
    });

    it('registers stores in the global registry', () => {
        interface State {
            val: number;
        }

        const devtoolsMw = devtools<State>({ name: 'testStore' });
        createStore<State>({ val: 42 }, { middleware: [devtoolsMw] });

        const registry = getDevToolsRegistry();
        expect(registry.stores.has('testStore')).toBe(true);
        expect(registry.stores.get('testStore')).toBe(devtoolsMw.api);
    });
});
