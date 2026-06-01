// ─────────────────────────────────────────────────────
// Tests — computed selectors for store
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { createStore, batch } from './store.js';

describe('computed', () => {
    it('returns the correct derived value on get()', () => {
        const useStore = createStore(() => ({ items: [1, 2, 3] }));
        const total = useStore.computed((s) => s.items.reduce((a, b) => a + b, 0));
        expect(total.get()).toBe(6);
    });

    it('derived value updates when store state changes', () => {
        const useStore = createStore((set) => ({
            count: 0,
            inc: () => set((s) => ({ count: s.count + 1 })),
        }));
        const doubled = useStore.computed((s) => s.count * 2);

        expect(doubled.get()).toBe(0);
        useStore.getState().inc();
        expect(doubled.get()).toBe(2);
        useStore.getState().inc();
        expect(doubled.get()).toBe(4);
    });

    it('subscriber is called when the computed value changes', () => {
        const useStore = createStore((set) => ({
            count: 0,
            inc: () => set((s) => ({ count: s.count + 1 })),
        }));
        const doubled = useStore.computed((s) => s.count * 2);
        const spy = vi.fn();
        doubled.subscribe(spy);

        useStore.getState().inc();
        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(2);
    });

    it('subscriber is NOT called when computed value is unchanged', () => {
        const useStore = createStore((set) => ({
            count: 0,
            label: 'hello',
            setLabel: (l: string) => set({ label: l }),
        }));
        const doubled = useStore.computed((s) => s.count * 2);
        const spy = vi.fn();
        doubled.subscribe(spy);

        // Only label changes — count stays 0, doubled stays 0
        useStore.getState().setLabel('world');
        expect(spy).not.toHaveBeenCalled();
    });

    it('unsubscribe stops the listener from being called', () => {
        const useStore = createStore((set) => ({
            count: 0,
            inc: () => set((s) => ({ count: s.count + 1 })),
        }));
        const doubled = useStore.computed((s) => s.count * 2);
        const spy = vi.fn();
        const unsub = doubled.subscribe(spy);

        unsub();
        useStore.getState().inc();
        expect(spy).not.toHaveBeenCalled();
    });

    it('multiple computed selectors on the same store are independent', () => {
        const useStore = createStore((set) => ({
            count: 0,
            inc: () => set((s) => ({ count: s.count + 1 })),
        }));
        const doubled = useStore.computed((s) => s.count * 2);
        const isEven = useStore.computed((s) => s.count % 2 === 0);

        useStore.getState().inc();
        expect(doubled.get()).toBe(2);
        expect(isEven.get()).toBe(false);

        useStore.getState().inc();
        expect(doubled.get()).toBe(4);
        expect(isEven.get()).toBe(true);
    });

    it('multiple subscribers on the same computed are all notified', () => {
        const useStore = createStore((set) => ({
            x: 0,
            set: (v: number) => set({ x: v }),
        }));
        const derived = useStore.computed((s) => s.x * 10);
        const spy1 = vi.fn();
        const spy2 = vi.fn();
        derived.subscribe(spy1);
        derived.subscribe(spy2);

        useStore.getState().set(5);
        expect(spy1).toHaveBeenCalledWith(50);
        expect(spy2).toHaveBeenCalledWith(50);
    });

    it('computed is accessible directly via the hook function', () => {
        const useStore = createStore(() => ({ value: 42 }));
        const doubled = useStore.computed((s) => s.value * 2);
        expect(doubled.get()).toBe(84);
    });

    it('initial cached value is correct when computed is called immediately after store creation', () => {
        // Regression: computed was previously defined before state was initialized,
        // causing selector(undefined) to seed the cache with the wrong value
        const useStore = createStore(() => ({ items: [10, 20, 30] }));
        const total = useStore.computed((s) => s.items.reduce((a, b) => a + b, 0));
        expect(total.get()).toBe(60);
    });

    it('computed subscriber fires correctly after a batch update', async () => {
        const useStore = createStore((set) => ({
            x: 0,
            y: 0,
        }));
        const sum = useStore.computed((s) => s.x + s.y);
        const spy = vi.fn();
        sum.subscribe(spy);

        batch(() => {
            useStore.setState({ x: 3 });
            useStore.setState({ y: 7 });
        });

        // Batch defers notifications via microtask — wait for it to flush
        await new Promise(resolve => queueMicrotask(resolve));

        expect(sum.get()).toBe(10);
        expect(spy).toHaveBeenCalledWith(10);
    });
});
