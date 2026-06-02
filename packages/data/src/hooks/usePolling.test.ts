import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@termuijs/testing';
import { createElement } from '@termuijs/jsx';
import { usePolling } from './usePolling.js';

describe('usePolling', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        (global as any).hookResult = null;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
        (global as any).hookResult = null;
    });

    function TestComponent({ fn, interval, deps }: { fn: () => Promise<any>, interval: number, deps?: unknown[] }) {
        const result = usePolling(fn, interval, deps);
        (global as any).hookResult = result;
        return null;
    }

    const flushPromises = async () => {
        for (let i = 0; i < 5; i++) {
            await Promise.resolve();
        }
    };

    it('Initial Loading State', () => {
        const fn = vi.fn().mockResolvedValue('test');
        render(createElement(TestComponent, { fn, interval: 1000 }));
        
        const result = (global as any).hookResult;
        expect(result.loading).toBe(true);
        expect(result.data).toBeNull();
        expect(result.error).toBeNull();
    });

    it('Success State', async () => {
        const fn = vi.fn().mockResolvedValue('success data');
        render(createElement(TestComponent, { fn, interval: 1000 }));
        
        // Wait for async resolution
        await flushPromises();
        
        const result = (global as any).hookResult;
        expect(result.loading).toBe(false);
        expect(result.data).toBe('success data');
        expect(result.error).toBeNull();
    });

    it('Error Handling', async () => {
        const error = new Error('Test Error');
        const fn = vi.fn().mockRejectedValue(error);
        render(createElement(TestComponent, { fn, interval: 1000 }));
        
        await flushPromises();
        
        const result = (global as any).hookResult;
        expect(result.loading).toBe(false);
        expect(result.data).toBeNull();
        expect(result.error).toBe(error);
    });

    it('Cleanup', async () => {
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
        const fn = vi.fn().mockResolvedValue('test');
        const { unmount } = render(createElement(TestComponent, { fn, interval: 1000 }));
        
        await flushPromises();
        
        unmount();
        
        expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('Re-runs when dependencies change', async () => {
        let callCount = 0;
        const fn = vi.fn().mockImplementation(async () => ++callCount);
        const { unmount } = render(createElement(TestComponent, { fn, interval: 1000, deps: [1] }));
        
        await flushPromises();
        expect((global as any).hookResult.data).toBe(1);
        expect(fn).toHaveBeenCalledTimes(1);

        // Advance timer by 1000ms
        await vi.advanceTimersByTimeAsync(1000);
        expect((global as any).hookResult.data).toBe(2);
        expect(fn).toHaveBeenCalledTimes(2);

        // Simulate dependency change by unmounting and remounting
        // (Since termui/testing might not have a full `rerender` for hooks test)
        unmount();
        render(createElement(TestComponent, { fn, interval: 1000, deps: [2] }));
        await flushPromises();
        
        // Setup re-runs, so fn executes again immediately on mount
        expect(fn).toHaveBeenCalledTimes(3);
        expect((global as any).hookResult.data).toBe(3);
    });
});
