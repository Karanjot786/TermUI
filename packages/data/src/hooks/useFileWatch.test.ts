import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { watch } from 'node:fs';

// Mock state capture variables
let stateValues: any[] = [];
let stateSetters: any[] = [];
let effectCb: (() => (() => void) | void) | null = null;
let stateCallCount = 0;

// Mock the JSX runtime hooks
vi.mock('@termuijs/jsx', () => ({
    useState: (initial: any) => {
        const id = stateCallCount++;
        if (stateValues[id] === undefined) {
            stateValues[id] = typeof initial === 'function' ? initial() : initial;
        }
        if (!stateSetters[id]) {
            stateSetters[id] = vi.fn((newVal) => {
                stateValues[id] = typeof newVal === 'function' ? newVal(stateValues[id]) : newVal;
            });
        }
        return [stateValues[id], stateSetters[id]];
    },
    useEffect: (cb: () => (() => void) | void) => {
        effectCb = cb;
    },
}));

// Mock the native fs module
vi.mock('node:fs', () => ({
    watch: vi.fn(),
}));

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const { useFileWatch } = await import('./useFileWatch.js');

describe('useFileWatch', () => {
    let mockWatcher: any;

    beforeEach(() => {
        stateValues = [];
        stateSetters = [];
        stateCallCount = 0;
        effectCb = null;

        // Set up a mock watch emitter with a .close method
        mockWatcher = new EventEmitter();
        mockWatcher.close = vi.fn();

        vi.mocked(watch).mockReturnValue(mockWatcher);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns initial loading state', () => {
        const result = useFileWatch('test-path');
        expect(result.loading).toBe(true);
        expect(result.data).toBeNull();
        expect(result.error).toBeNull();
    });

    it('returns data after async resolution', async () => {
        useFileWatch('test-path');

        if (effectCb) {
            effectCb();
        }

        // Simulate a 'change' event emitted by the watcher
        mockWatcher.emit('change', 'change', 'file.txt');

        await flushPromises();

        // Check if state updated correctly (data is set, error is null, loading is false)
        expect(stateValues[0]).toEqual({ eventType: 'change', filename: 'file.txt' });
        expect(stateValues[1]).toBeNull();
        expect(stateValues[2]).toBe(false);
    });

    it('cleanup runs on unmount', () => {
        useFileWatch('test-path');

        if (effectCb) {
            const cleanup = effectCb();
            expect(mockWatcher.close).not.toHaveBeenCalled();

            if (typeof cleanup === 'function') {
                cleanup();
            }
            expect(mockWatcher.close).toHaveBeenCalledTimes(1);
        }
    });

    it('error state is set when the operation fails', async () => {
        useFileWatch('test-path');

        if (effectCb) {
            effectCb();
        }

        const error = new Error('Watch failed');
        mockWatcher.emit('error', error);

        await flushPromises();

        expect(stateValues[0]).toBeNull();
        expect(stateValues[1]).toBe(error);
        expect(stateValues[2]).toBe(false);
    });

    it('handles initialization error gracefully', async () => {
        // Force watch to throw an error immediately during setup
        vi.mocked(watch).mockImplementation(() => {
            throw new Error('Directory does not exist');
        });

        useFileWatch('invalid-path');

        if (effectCb) {
            effectCb();
        }

        await flushPromises();

        expect(stateValues[0]).toBeNull();
        expect(stateValues[1]).toBeInstanceOf(Error);
        expect(stateValues[1].message).toBe('Directory does not exist');
        expect(stateValues[2]).toBe(false);
    });
});
