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
});
