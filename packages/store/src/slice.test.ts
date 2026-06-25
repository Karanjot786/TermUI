import { describe, it, expect, vi } from 'vitest';
import { createSlice, combineSlices, createLazySlice } from './slice.js';

describe('Store Slicing & Module System', () => {
    it('combines slices into a unified store', () => {
        const counterSlice = createSlice('counter', (set) => ({
            count: 0,
            inc: () => set((s) => ({ count: s.count + 1 }))
        }));

        const labelSlice = createSlice('label', (set) => ({
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
        const counterMiddleware = vi.fn((prevState, update, next) => next(update));
        const labelMiddleware = vi.fn((prevState, update, next) => next(update));

        const counterSlice = createSlice('counter', (set) => ({
            count: 0,
            inc: () => set((s) => ({ count: s.count + 1 }))
        }), { middleware: [counterMiddleware] });

        const labelSlice = createSlice('label', (set) => ({
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
        const counterSlice = createSlice('counter', (set, get, globalSet, globalGet) => ({
            count: 0,
            incAndLog: () => {
                set((s) => ({ count: s.count + 1 }));
                globalSet({
                    logs: { history: [...globalGet().logs.history, 'inc'] }
                });
            }
        }));

        const logSlice = createSlice('logs', () => ({
            history: [] as string[]
        }));

        const useAppStore = combineSlices(counterSlice, logSlice);

        useAppStore.getState().counter.incAndLog();
        expect(useAppStore.getState().counter.count).toBe(1);
        expect(useAppStore.getState().logs.history).toEqual(['inc']);
    });

    it('lazy loads slices on demand', async () => {
        // Mock a module dynamically
        const heavySliceLoader = async () => ({
            default: createSlice('heavy', (set) => ({ data: 'loaded' }))
        });

        const heavyLazySlice = createLazySlice('heavy', heavySliceLoader);
        const useAppStore = combineSlices(heavyLazySlice);

        expect((useAppStore.getState() as any).heavy).toBeUndefined();

        await useAppStore.loadLazySlice('heavy');

        expect(useAppStore.getState().heavy.data).toBe('loaded');
    });
});
