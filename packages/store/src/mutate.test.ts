import { expect, it, describe, vi } from 'vitest';
import { signal, mutate } from './mutate.js';

describe('mutate helper', () => {
    it('without mutate(), an in-place push alone does NOT trigger a re-render', () => {
        const items = signal<string[]>([]);
        const listener = vi.fn();
        items.subscribe(listener);

        // In-place mutation without mutate() or reassignment
        items.value.push('a');
        
        // Listener should not be called because the setter wasn't triggered
        expect(listener).not.toHaveBeenCalled();
    });

    it('mutate(signal) triggers a re-render after in-place mutations', () => {
        const items = signal<string[]>([]);
        const listener = vi.fn();
        items.subscribe(listener);

        items.value.push('a');
        mutate(items);

        // mutate() should forcefully trigger the listeners
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith(['a']);
    });

    it('is safe against listener mutation during iteration', () => {
        const sig = signal({ count: 0 });
        const listenerSkipped = vi.fn();
        
        const unsub1 = sig.subscribe(() => {
            // A UI state change causes a child component to unmount, removing its listener
            unsub2(); 
        });
        
        const unsub2 = sig.subscribe(listenerSkipped);

        // Trigger the loop
        mutate(sig);
        
        // listenerSkipped should NOT be called because unsub1 unsubscribed it 
        // before the snapshot loop reached it.
        expect(listenerSkipped).not.toHaveBeenCalled();
    });
});
