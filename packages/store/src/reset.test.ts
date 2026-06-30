import { describe, it, expect, vi } from 'vitest';
import { createStore } from './store.js';

describe('store reset', () => {
    it('getInitialState returns the creation snapshot', () => {
        const useStore = createStore(() => ({
            count: 0,
        }));

        useStore.setState({ count: 10 });

        expect(useStore.getInitialState()).toEqual({
            count: 0,
        });
    });

    it('reset restores changed values', () => {
        const useStore = createStore(() => ({
            count: 0,
        }));

        useStore.setState({ count: 20 });

        expect(useStore.getState().count).toBe(20);

        useStore.reset();

        expect(useStore.getState().count).toBe(0);
    });

    it('reset keeps action functions callable', () => {
        interface CounterStore {
            count: number;
            increment: () => void;
        }

        const useStore = createStore<CounterStore>((set) => ({
            count: 0,
            increment: () =>
                set((s) => ({
                    count: s.count + 1,
                })),
        }));

        useStore.getState().increment();

        expect(useStore.getState().count).toBe(1);

        useStore.reset();

        useStore.getState().increment();

        expect(useStore.getState().count).toBe(1);
    });

    it('getInitialState returns a safe copy', () => {
        const useStore = createStore(() => ({
            count: 0,
        }));
    
        const initial = useStore.getInitialState();
    
        initial.count = 999;
    
        expect(useStore.getInitialState()).toEqual({
            count: 0,
        });
    
        expect(useStore.getState().count).toBe(0);
    });

    it('reset notifies subscribers once', () => {
        const useStore = createStore(() => ({
            count: 0,
        }));

        const listener = vi.fn();

        useStore.subscribe(listener);

        useStore.setState({ count: 5 });

        listener.mockClear();

        useStore.reset();

        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('safely clones complex types like Map, Set, Date, and nested functions', () => {
        const date = new Date('2026-01-01');
        const map = new Map([['a', 1]]);
        const set = new Set([1, 2]);
        const sym = Symbol('test');
        
        const useStore = createStore(() => ({
            date,
            map,
            set,
            nested: {
                fn: () => true,
                value: 42
            },
            [sym]: 'symbol_value'
        }));

        const initial = useStore.getInitialState();
        
        expect(initial.date).toEqual(date);
        expect(initial.date).not.toBe(date); // should be cloned
        
        expect(initial.map).toEqual(map);
        expect(initial.map).not.toBe(map);
        
        expect(initial.set).toEqual(set);
        expect(initial.set).not.toBe(set);
        
        expect(initial.nested.value).toBe(42);
        expect(initial.nested.fn).toBeUndefined(); // functions are stripped
        
        expect((initial as any)[sym]).toBe('symbol_value');
        
        useStore.setState({ date: new Date(), nested: { value: 99, fn: () => true } });
        useStore.reset();
        
        const resetState = useStore.getState();
        expect(resetState.date).toEqual(date);
        expect(resetState.nested.value).toBe(42);
    });
});