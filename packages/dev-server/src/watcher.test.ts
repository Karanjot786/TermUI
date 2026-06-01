import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileWatcher } from './watcher.js';
import { watch, existsSync } from 'node:fs';
import { EventEmitter } from 'node:events';

vi.mock('node:fs', () => ({
    watch: vi.fn(),
    existsSync: vi.fn(() => true)
}));

describe('FileWatcher', () => {
    let mockWatcherEmitter: EventEmitter;

    beforeEach(() => {
        vi.useFakeTimers();
        mockWatcherEmitter = new EventEmitter();
        vi.mocked(watch).mockReturnValue(mockWatcherEmitter as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('registers and executes onChange events', () => {
        const watcher = new FileWatcher(['./src']);
        const changeSpy = vi.fn();

        watcher.onChange(changeSpy);
        watcher.start();

        mockWatcherEmitter.emit('change', 'change', 'index.tsx');
        vi.advanceTimersByTime(100);

        expect(changeSpy).toHaveBeenCalledTimes(1);
    });

    it('handles multiple rapid changes via debouncing', () => {
        const watcher = new FileWatcher(['./src']);
        const changeSpy = vi.fn();

        watcher.onChange(changeSpy);
        watcher.start();

        mockWatcherEmitter.emit('change', 'change', 'App.tsx');
        vi.advanceTimersByTime(40);
        mockWatcherEmitter.emit('change', 'change', 'App.tsx');

        expect(changeSpy).not.toHaveBeenCalled();
        vi.advanceTimersByTime(100);
        expect(changeSpy).toHaveBeenCalledTimes(1);
    });
});