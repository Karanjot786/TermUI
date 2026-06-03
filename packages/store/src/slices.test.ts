// ─────────────────────────────────────────────────────
// Tests — slices helper
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { createStore } from './store.js';
import { slices } from './slices.js';

// ── Slice type helpers ────────────────────────────────

type CounterSlice = {
    count: number;
    inc: () => void;
    dec: () => void;
    reset: () => void;
};

type LabelSlice = {
    label: string;
    setLabel: (t: string) => void;
};

type StoreState = CounterSlice & LabelSlice;

// ── Tests ─────────────────────────────────────────────

describe('slices', () => {
    it('composes two slices into a single store', () => {
        const useStore = createStore(
            slices<StoreState>({
                counter: (set) => ({
                    count: 0,
                    inc:   () => set((s) => ({ count: s.count + 1 })),
                    dec:   () => set((s) => ({ count: s.count - 1 })),
                    reset: () => set({ count: 0 }),
                }),
                label: (set) => ({
                    label:    'hello',
                    setLabel: (t: string) => set({ label: t }),
                }),
            }),
        );

        expect(useStore.getState().count).toBe(0);
        expect(useStore.getState().label).toBe('hello');
    });

    it('actions from each slice update state correctly', () => {
        const useStore = createStore(
            slices<StoreState>({
                counter: (set) => ({
                    count: 0,
                    inc:   () => set((s) => ({ count: s.count + 1 })),
                    dec:   () => set((s) => ({ count: s.count - 1 })),
                    reset: () => set({ count: 0 }),
                }),
                label: (set) => ({
                    label:    'hello',
                    setLabel: (t: string) => set({ label: t }),
                }),
            }),
        );

        useStore.getState().inc();
        useStore.getState().inc();
        expect(useStore.getState().count).toBe(2);

        useStore.getState().setLabel('world');
        expect(useStore.getState().label).toBe('world');
    });

    it('slices do not interfere with each other on update', () => {
        const useStore = createStore(
            slices<StoreState>({
                counter: (set) => ({
                    count: 10,
                    inc:   () => set((s) => ({ count: s.count + 1 })),
                    dec:   () => set((s) => ({ count: s.count - 1 })),
                    reset: () => set({ count: 0 }),
                }),
                label: (set) => ({
                    label:    'foo',
                    setLabel: (t: string) => set({ label: t }),
                }),
            }),
        );

        useStore.getState().inc();
        // label should remain unchanged
        expect(useStore.getState().label).toBe('foo');

        useStore.getState().setLabel('bar');
        // count should remain unchanged
        expect(useStore.getState().count).toBe(11);
    });

    it('a slice can read another slice state via get()', () => {
        type CrossSliceState = {
            count: number;
            inc: () => void;
            doubled: () => number;
        };

        const useStore = createStore(
            slices<CrossSliceState>({
                counter: (set) => ({
                    count: 5,
                    inc:   () => set((s) => ({ count: s.count + 1 })),
                }),
                derived: (_set, get) => ({
                    // reads counter slice state via get()
                    doubled: () => get().count * 2,
                }),
            }),
        );

        expect(useStore.getState().doubled()).toBe(10);
        useStore.getState().inc();
        expect(useStore.getState().doubled()).toBe(12);
    });

    it('reset action restores initial value', () => {
        const useStore = createStore(
            slices<StoreState>({
                counter: (set) => ({
                    count: 0,
                    inc:   () => set((s) => ({ count: s.count + 1 })),
                    dec:   () => set((s) => ({ count: s.count - 1 })),
                    reset: () => set({ count: 0 }),
                }),
                label: (set) => ({
                    label:    'hello',
                    setLabel: (t: string) => set({ label: t }),
                }),
            }),
        );

        useStore.getState().inc();
        useStore.getState().inc();
        useStore.getState().reset();
        expect(useStore.getState().count).toBe(0);
    });

    it('subscribe fires when a slice updates', () => {
        const useStore = createStore(
            slices<StoreState>({
                counter: (set) => ({
                    count: 0,
                    inc:   () => set((s) => ({ count: s.count + 1 })),
                    dec:   () => set((s) => ({ count: s.count - 1 })),
                    reset: () => set({ count: 0 }),
                }),
                label: (set) => ({
                    label:    'hello',
                    setLabel: (t: string) => set({ label: t }),
                }),
            }),
        );

        const spy = vi.fn();
        useStore.subscribe(spy);

        useStore.getState().inc();
        expect(spy).toHaveBeenCalledOnce();
        expect(spy.mock.calls[0][0].count).toBe(1);
    });

    it('empty slices object does not throw and returns an empty store', () => {
        expect(() => {
            const useStore = createStore(slices<object>({}));
            useStore.getState();
        }).not.toThrow();
    });

    it('three slices all merge correctly', () => {
        type ThreeSliceState = {
            a: number;
            b: string;
            c: boolean;
            setA: (v: number) => void;
            setB: (v: string) => void;
            setC: (v: boolean) => void;
        };

        const useStore = createStore(
            slices<ThreeSliceState>({
                sliceA: (set) => ({ a: 1,     setA: (v) => set({ a: v }) }),
                sliceB: (set) => ({ b: 'hi',  setB: (v) => set({ b: v }) }),
                sliceC: (set) => ({ c: false, setC: (v) => set({ c: v }) }),
            }),
        );

        expect(useStore.getState().a).toBe(1);
        expect(useStore.getState().b).toBe('hi');
        expect(useStore.getState().c).toBe(false);

        useStore.getState().setA(99);
        useStore.getState().setB('world');
        useStore.getState().setC(true);

        expect(useStore.getState().a).toBe(99);
        expect(useStore.getState().b).toBe('world');
        expect(useStore.getState().c).toBe(true);
    });
});
