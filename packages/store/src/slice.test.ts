import { describe, it, expect, vi } from 'vitest';
import { createSlice, combineSlices, createLazySlice } from './slice.js';

describe('Store Slicing & Module System', () => {
    it('combines slices into a unified store', () => {
        interface CounterState {
            count: number;
            inc: () => void;
        }
        interface LabelState {
            text: string;
            setText: (text: string) => void;
        }

        const counterSlice = createSlice<CounterState, any>('counter', (set) => ({
            count: 0,
            inc: () => set((s) => ({ count: s.count + 1 }))
        }));

        const labelSlice = createSlice<LabelState, any>('label', (set) => ({
            text: 'hello',
            setText: (text: string) => set({ text })
        }));

        const useAppStore = combineSlices(counterSlice, labelSlice);

        expect(useAppStore.getState().counter.count).toBe(0);
        expect(useAppStore.getState().label.text).toBe('hello');

        useAppStore.getState().counter.inc();
        expect(useAppStore.getState().counter.count).toBe(1);

        useAppStore.getState().label.setText('world');
        expect(useAppStore.getState().label.text).toBe('world');
    });

    it('isolates middlewares to specific slices', () => {
        interface CounterState {
            count: number;
            inc: () => void;
        }
        interface LabelState {
            text: string;
            setText: (text: string) => void;
        }

        const counterMiddleware = vi.fn((prevState, update, next) => next(update));
        const labelMiddleware = vi.fn((prevState, update, next) => next(update));

        const counterSlice = createSlice<CounterState, any>('counter', (set) => ({
            count: 0,
            inc: () => set((s) => ({ count: s.count + 1 }))
        }), { middleware: [counterMiddleware] });

        const labelSlice = createSlice<LabelState, any>('label', (set) => ({
            text: '',
            setText: (text: string) => set({ text })
        }), { middleware: [labelMiddleware] });

        const useAppStore = combineSlices(counterSlice, labelSlice);

        expect(counterMiddleware).not.toHaveBeenCalled();
        expect(labelMiddleware).not.toHaveBeenCalled();

        useAppStore.getState().counter.inc();
        expect(counterMiddleware).toHaveBeenCalledTimes(1);
        expect(labelMiddleware).not.toHaveBeenCalled();

        useAppStore.getState().label.setText('a');
        expect(counterMiddleware).toHaveBeenCalledTimes(1);
        expect(labelMiddleware).toHaveBeenCalledTimes(1);
    });

    it('allows cross-slice reads and writes', () => {
        interface CounterState {
            count: number;
            incAndLog: () => void;
        }
        interface LogState {
            history: string[];
        }
        interface GlobalState {
            counter: CounterState;
            logs: LogState;
        }

        const counterSlice = createSlice<CounterState, GlobalState>('counter', (set, get, globalSet, globalGet) => ({
            count: 0,
            incAndLog: () => {
                set((s) => ({ count: s.count + 1 }));
                globalSet({
                    logs: { history: [...globalGet().logs.history, 'inc'] }
                } as any);
            }
        }));

        const logSlice = createSlice<LogState, GlobalState>('logs', () => ({
            history: [] as string[]
        }));

        const useAppStore = combineSlices(counterSlice, logSlice);

        useAppStore.getState().counter.incAndLog();
        expect(useAppStore.getState().counter.count).toBe(1);
        expect(useAppStore.getState().logs.history).toEqual(['inc']);
    });

    it('lazy loads slices on demand', async () => {
        interface HeavyState {
            data: string;
        }
        // Mock a module dynamically
        const heavySliceLoader = async () => ({
            default: createSlice<HeavyState, any>('heavy', () => ({ data: 'loaded' }))
        });

        const heavyLazySlice = createLazySlice<HeavyState, any>('heavy', heavySliceLoader);
        const useAppStore = combineSlices(heavyLazySlice);

        // TypeScript type is now T | undefined, so no cast is needed
        expect(useAppStore.getState().heavy).toBeUndefined();

        await useAppStore.loadLazySlice('heavy');

        expect(useAppStore.getState().heavy?.data).toBe('loaded');
    });

    it('supports direct loading of slice definition without default wrapper', async () => {
        interface HeavyDirectState {
            ok: boolean;
        }
        const heavySliceLoader = async () => createSlice<HeavyDirectState, any>('heavyDirect', () => ({ ok: true }));
        const heavyLazySlice = createLazySlice<HeavyDirectState, any>('heavyDirect', heavySliceLoader);
        const useAppStore = combineSlices(heavyLazySlice);

        await useAppStore.loadLazySlice('heavyDirect');
        expect(useAppStore.getState().heavyDirect?.ok).toBe(true);
    });

    it('safely handles concurrent lazy slice loading', async () => {
        interface HeavyConcurrentState {
            ok: boolean;
        }
        let loadCount = 0;
        const heavySliceLoader = async () => {
            loadCount++;
            return createSlice<HeavyConcurrentState, any>('heavyConcurrent', () => ({ ok: true }));
        };
        const heavyLazySlice = createLazySlice<HeavyConcurrentState, any>('heavyConcurrent', heavySliceLoader);
        const useAppStore = combineSlices(heavyLazySlice);

        // Trigger two loads concurrently
        const p1 = useAppStore.loadLazySlice('heavyConcurrent');
        const p2 = useAppStore.loadLazySlice('heavyConcurrent');

        await Promise.all([p1, p2]);
        expect(loadCount).toBe(1);
        expect(useAppStore.getState().heavyConcurrent?.ok).toBe(true);
    });

    it('resets combined stores properly including unloading lazy slices', async () => {
        interface EagerState {
            val: number;
            inc: () => void;
        }
        interface LazyState {
            val: number;
            inc: () => void;
        }

        const eagerSlice = createSlice<EagerState, any>('eager', (set) => ({
            val: 1,
            inc: () => set((s) => ({ val: s.val + 1 }))
        }));
        const lazySlice = createLazySlice<LazyState, any>('lazy', async () =>
            createSlice<LazyState, any>('lazy', (set) => ({
                val: 10,
                inc: () => set((s) => ({ val: s.val + 1 }))
            }))
        );

        const useAppStore = combineSlices(eagerSlice, lazySlice);

        useAppStore.getState().eager.inc();
        expect(useAppStore.getState().eager.val).toBe(2);

        await useAppStore.loadLazySlice('lazy');
        useAppStore.getState().lazy?.inc();
        expect(useAppStore.getState().lazy?.val).toBe(11);

        // Reset the store
        useAppStore.reset();

        expect(useAppStore.getState().eager.val).toBe(1);
        expect(useAppStore.getState().lazy).toBeUndefined();
    });
});
