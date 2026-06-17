import { test, expect, vi } from 'vitest';
import { createStore, batch } from './store';

test('nested async batch test', async () => {
    const useAppStore = createStore((set) => ({
        count: 0,
        status: 'idle',
        increment: () => set((s) => ({ count: s.count + 1 })),
        setStatus: (status: string) => set({ status })
    }));

    const listener = vi.fn();
    useAppStore.subscribe(listener);

    await batch(async () => {
        useAppStore.getState().setStatus('loading');
        
        await Promise.resolve(); // Simulate async gap
        
        batch(() => {
            useAppStore.getState().increment();
            useAppStore.getState().increment();
        });
        
        useAppStore.getState().setStatus('done');
    });

    // Wait for microtasks
    await Promise.resolve();
    
    expect(listener).toHaveBeenCalledTimes(1);
});
