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

    // ─── Existing tests (preserved) ──────────────────────────────────────────

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

    // ─── 1. Unsupported file extensions are ignored ───────────────────────────

    describe('unsupported file extensions', () => {
        const unsupportedFiles = ['styles.css', 'README.md', 'data.json', 'image.png'];

        for (const filename of unsupportedFiles) {
            it(`emits no change for "${filename}"`, () => {
                const watcher = new FileWatcher(['./src']);
                const changeSpy = vi.fn();

                watcher.onChange(changeSpy);
                watcher.start();

                mockWatcherEmitter.emit('change', 'change', filename);
                vi.advanceTimersByTime(200);

                expect(changeSpy).not.toHaveBeenCalled();
            });
        }
    });

    // ─── 2. Missing / falsy filenames are ignored ─────────────────────────────

    describe('missing or falsy filename', () => {
        const invalidFilenames = [undefined, null, ''];

        for (const filename of invalidFilenames) {
            it(`does not throw and emits no change when filename is ${JSON.stringify(filename)}`, () => {
                const watcher = new FileWatcher(['./src']);
                const changeSpy = vi.fn();

                watcher.onChange(changeSpy);
                watcher.start();

                expect(() => {
                    mockWatcherEmitter.emit('change', 'change', filename);
                    vi.advanceTimersByTime(200);
                }).not.toThrow();

                expect(changeSpy).not.toHaveBeenCalled();
            });
        }
    });

    // ─── 3. Supported extension → correct FileChange.type mapping ─────────────

    describe('supported extension type mapping', () => {
        const cases: Array<[string, 'tsx' | 'tss' | 'config']> = [
            ['App.tsx',             'tsx'],
            ['index.ts',            'tsx'],
            ['Component.jsx',       'tsx'],
            ['main.js',             'tsx'],
            ['theme.tss',           'tss'],
            ['termui.config.ts',    'config'],
            ['termui.config.js',    'config'],
        ];

        for (const [filename, expectedType] of cases) {
            it(`maps "${filename}" → type "${expectedType}"`, () => {
                const watcher = new FileWatcher(['./src']);
                const changeSpy = vi.fn();

                watcher.onChange(changeSpy);
                watcher.start();

                mockWatcherEmitter.emit('change', 'change', filename);
                vi.advanceTimersByTime(100);

                expect(changeSpy).toHaveBeenCalledTimes(1);
                const change = changeSpy.mock.calls[0][0];
                expect(change.type).toBe(expectedType);
                expect(change.filename).toBe(filename);
            });
        }
    });

    // ─── 4. Debounce coalesces rapid same-file changes ────────────────────────

    it('emits only one event when the same file changes multiple times within debounce window', () => {
        const watcher = new FileWatcher(['./src']);
        const changeSpy = vi.fn();

        watcher.onChange(changeSpy);
        watcher.start();

        mockWatcherEmitter.emit('change', 'change', 'App.tsx');
        vi.advanceTimersByTime(20);
        mockWatcherEmitter.emit('change', 'change', 'App.tsx');
        vi.advanceTimersByTime(20);
        mockWatcherEmitter.emit('change', 'change', 'App.tsx');

        // Still within debounce window — no callback yet
        expect(changeSpy).not.toHaveBeenCalled();

        vi.advanceTimersByTime(100);

        expect(changeSpy).toHaveBeenCalledTimes(1);
    });

    // ─── 5. Different files use independent debounce timers ───────────────────

    it('fires separate events for different files even within the same debounce window', () => {
        const watcher = new FileWatcher(['./src']);
        const changeSpy = vi.fn();

        watcher.onChange(changeSpy);
        watcher.start();

        mockWatcherEmitter.emit('change', 'change', 'App.tsx');
        mockWatcherEmitter.emit('change', 'change', 'Header.tsx');
        mockWatcherEmitter.emit('change', 'change', 'theme.tss');

        vi.advanceTimersByTime(100);

        expect(changeSpy).toHaveBeenCalledTimes(3);

        const filenames = changeSpy.mock.calls.map(([c]) => c.filename);
        expect(filenames).toContain('App.tsx');
        expect(filenames).toContain('Header.tsx');
        expect(filenames).toContain('theme.tss');
    });

    // ─── 6. stop() cancels pending debounced events ───────────────────────────

    it('does not fire callback when stop() is called before debounce completes', () => {
        const watcher = new FileWatcher(['./src']);
        const changeSpy = vi.fn();

        watcher.onChange(changeSpy);
        watcher.start();

        mockWatcherEmitter.emit('change', 'change', 'App.tsx');

        // Stop before the 100 ms debounce fires
        watcher.stop();

        vi.advanceTimersByTime(200);

        expect(changeSpy).not.toHaveBeenCalled();
    });

    // ─── 7. Missing watch directory — no watcher created, no exception ────────

    it('skips non-existent directories without throwing', () => {
        vi.mocked(existsSync).mockReturnValue(false);

        const watcher = new FileWatcher(['./does-not-exist']);
        const changeSpy = vi.fn();

        watcher.onChange(changeSpy);

        expect(() => watcher.start()).not.toThrow();
        expect(vi.mocked(watch)).not.toHaveBeenCalled();
    });

    // ─── 8. Error event forwarding ────────────────────────────────────────────

    it('forwards watcher errors to onError listeners', () => {
        const watcher = new FileWatcher(['./src']);
        const errorSpy = vi.fn();

        watcher.onError(errorSpy);
        watcher.start();

        const err = new Error('disk read failure');
        mockWatcherEmitter.emit('error', err);

        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledWith(err);
    });

    // ─── 9. AbortError is silently ignored ────────────────────────────────────

    it('does not invoke error callbacks for AbortError', () => {
        const watcher = new FileWatcher(['./src']);
        const errorSpy = vi.fn();

        watcher.onError(errorSpy);
        watcher.start();

        const abortErr = new Error('The operation was aborted');
        abortErr.name = 'AbortError';
        mockWatcherEmitter.emit('error', abortErr);

        expect(errorSpy).not.toHaveBeenCalled();
    });

    // ─── 10. Multiple change listeners all receive the same FileChange ─────────

    it('invokes all registered onChange listeners with identical FileChange data', () => {
        const watcher = new FileWatcher(['./src']);
        const spy1 = vi.fn();
        const spy2 = vi.fn();
        const spy3 = vi.fn();

        watcher.onChange(spy1);
        watcher.onChange(spy2);
        watcher.onChange(spy3);
        watcher.start();

        mockWatcherEmitter.emit('change', 'change', 'App.tsx');
        vi.advanceTimersByTime(100);

        expect(spy1).toHaveBeenCalledTimes(1);
        expect(spy2).toHaveBeenCalledTimes(1);
        expect(spy3).toHaveBeenCalledTimes(1);

        // All listeners receive the same object reference
        expect(spy1.mock.calls[0][0]).toEqual(spy2.mock.calls[0][0]);
        expect(spy2.mock.calls[0][0]).toEqual(spy3.mock.calls[0][0]);
    });

    // ─── 11. Multiple error listeners all receive the same error ──────────────

    it('invokes all registered onError listeners with the same error object', () => {
        const watcher = new FileWatcher(['./src']);
        const errSpy1 = vi.fn();
        const errSpy2 = vi.fn();

        watcher.onError(errSpy1);
        watcher.onError(errSpy2);
        watcher.start();

        const err = new Error('test error');
        mockWatcherEmitter.emit('error', err);

        expect(errSpy1).toHaveBeenCalledWith(err);
        expect(errSpy2).toHaveBeenCalledWith(err);
    });

    // ─── 12. Multiple watch directories ──────────────────────────────────────

    it('creates a watcher for each valid directory', () => {
        const dirs = ['./src', './components', './themes'];
        const watcher = new FileWatcher(dirs);

        watcher.start();

        expect(vi.mocked(watch)).toHaveBeenCalledTimes(dirs.length);
    });

    it('handles events from multiple directories independently', () => {
        // Use separate emitters per directory
        const emitters = [new EventEmitter(), new EventEmitter(), new EventEmitter()];
        let callCount = 0;
        vi.mocked(watch).mockImplementation(() => emitters[callCount++] as any);

        const watcher = new FileWatcher(['./src', './components', './themes']);
        const changeSpy = vi.fn();

        watcher.onChange(changeSpy);
        watcher.start();

        emitters[0].emit('change', 'change', 'App.tsx');
        emitters[1].emit('change', 'change', 'Header.tsx');
        emitters[2].emit('change', 'change', 'theme.tss');

        vi.advanceTimersByTime(100);

        expect(changeSpy).toHaveBeenCalledTimes(3);
    });

    it('skips non-existent directories but still watches valid ones', () => {
        // First dir missing, second exists
        vi.mocked(existsSync).mockImplementation((p) => String(p).includes('components'));

        const watcher = new FileWatcher(['./src', './components']);
        watcher.start();

        // Only one call for the existing directory
        expect(vi.mocked(watch)).toHaveBeenCalledTimes(1);
    });

    // ─── 13. Timestamp generation ─────────────────────────────────────────────

    it('attaches a timestamp within the expected execution range', () => {
        const before = Date.now();
        const watcher = new FileWatcher(['./src']);
        const changeSpy = vi.fn();

        watcher.onChange(changeSpy);
        watcher.start();

        mockWatcherEmitter.emit('change', 'change', 'App.tsx');
        vi.advanceTimersByTime(100);

        const after = Date.now();

        expect(changeSpy).toHaveBeenCalledTimes(1);
        const { timestamp } = changeSpy.mock.calls[0][0];
        expect(typeof timestamp).toBe('number');
        expect(timestamp).toBeGreaterThanOrEqual(before);
        expect(timestamp).toBeLessThanOrEqual(after);
    });
});