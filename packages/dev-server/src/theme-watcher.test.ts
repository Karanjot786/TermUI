/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeWatcher } from './theme-watcher.js';
import { watch, existsSync } from 'node:fs';
import { EventEmitter } from 'node:events';

const { watch: mockWatch, existsSync: mockExistsSync } = vi.hoisted(() => ({
    watch: vi.fn(),
    existsSync: vi.fn(() => true),
}));

vi.mock('node:fs', () => ({
    watch: mockWatch,
    existsSync: mockExistsSync,
}));


describe('ThemeWatcher', () => {
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

    it('notifies attached child via IPC on .tss change', () => {
        const watcher = new ThemeWatcher({ watchDirs: ['./themes'] });
        const mockChild = { send: vi.fn(), killed: false, exitCode: null } as any;

        watcher.attachChild(mockChild);
        watcher.start();

        mockWatcherEmitter.emit('change', 'change', 'cool-theme.tss');
        vi.advanceTimersByTime(100);

        expect(mockChild.send).toHaveBeenCalledTimes(1);
        expect(mockChild.send).toHaveBeenCalledWith({ type: 'theme-reload', filename: 'cool-theme.tss' });
    });

    it('emits onChange to listeners on .tss change', () => {
        const watcher = new ThemeWatcher({ watchDirs: ['./themes'] });
        const changeSpy = vi.fn();

        watcher.onChange(changeSpy);
        watcher.start();

        mockWatcherEmitter.emit('change', 'change', 'styles.tss');
        vi.advanceTimersByTime(100);

        expect(changeSpy).toHaveBeenCalledTimes(1);
        const arg = changeSpy.mock.calls[0][0];
        expect(arg).toHaveProperty('filename', 'styles.tss');
        expect(arg).toHaveProperty('timestamp');
    });

    it('does not collide when different watched dirs contain the same filename', () => {
        // Simulate two separate watchers (different directories) both reporting
        // a change for the same basename. They should produce two onChange events.
        const emitters = [new EventEmitter(), new EventEmitter()];
        let callCount = 0;
        vi.mocked(watch).mockImplementation(
            // EventEmitter provides the on/emit behavior needed for this test,
            // but watch() is typed to return FSWatcher.
            () => emitters[callCount++] as any
        );

        const watcher = new ThemeWatcher({ watchDirs: ['./themes', './more-themes'] });
        const changeSpy = vi.fn();

        watcher.onChange(changeSpy);
        watcher.start();

        // Both directories emit a change for "index.tss"
        emitters[0].emit('change', 'change', 'index.tss');
        emitters[1].emit('change', 'change', 'index.tss');

        vi.advanceTimersByTime(100);

        // Expect two separate events (one per directory/file), not one.
        expect(changeSpy).toHaveBeenCalledTimes(2);
    });
});
