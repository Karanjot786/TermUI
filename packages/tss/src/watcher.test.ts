// ─────────────────────────────────────────────────────
// @termuijs/tss — Tests for TSSWatcher
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeEngine } from './engine.js';

// ── fs mock ────────────────────────────────────────────────────────────────
// We hoist a mutable state object so individual tests can configure behaviour.

const fsState = {
    exists: true,
    // Fake watcher instances keyed by the order watch() is called
    fakeWatchers: [] as FakeWatcher[],
    watchCallCount: 0,
};

interface FakeWatcher {
    listeners: Record<string, ((...args: unknown[]) => void)[]>;
    on: (event: string, fn: (...args: unknown[]) => void) => void;
    emit: (event: string, ...args: unknown[]) => void;
}

function makeFakeWatcher(): FakeWatcher {
    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
    return {
        listeners,
        on(event: string, fn: (...args: unknown[]) => void) {
            listeners[event] = listeners[event] ?? [];
            listeners[event].push(fn);
        },
        emit(event: string, ...args: unknown[]) {
            for (const fn of listeners[event] ?? []) fn(...args);
        },
    };
}

vi.mock('node:fs', () => ({
    existsSync: (p: unknown) => fsState.exists,
    watch: (_dir: unknown, _opts: unknown) => {
        const fw = makeFakeWatcher();
        fsState.fakeWatchers.push(fw);
        fsState.watchCallCount++;
        return fw;
    },
    readdirSync: () => [],
    readFileSync: () => '',
}));

// Import AFTER mock is registered
const { TSSWatcher } = await import('./watcher.js');

// ── Helpers ────────────────────────────────────────────────────────────────

function makeEngine() {
    return new ThemeEngine();
}

/** Reset shared fs state before every test */
function resetFsState(exists = true) {
    fsState.exists = exists;
    fsState.fakeWatchers = [];
    fsState.watchCallCount = 0;
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe('TSSWatcher', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        resetFsState(true);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // ── 1. Non-TSS files are ignored ────────────────────────────────────────

    describe('non-.tss file changes are ignored', () => {
        const ignoredFiles = ['styles.css', 'theme.json', 'README.md', '.tssrc'];

        for (const filename of ignoredFiles) {
            it(`does not notify when "${filename}" changes`, () => {
                const onChange = vi.fn();
                const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine() });
                watcher.onChange(onChange);
                watcher.start();

                const fw = fsState.fakeWatchers[0];
                fw.emit('change', 'rename', filename);
                vi.runAllTimers();

                expect(onChange).not.toHaveBeenCalled();
            });
        }
    });

    // ── 2. Missing / null / empty filename ──────────────────────────────────

    describe('missing filename values are handled gracefully', () => {
        const badFilenames = [undefined, null, ''];

        for (const filename of badFilenames) {
            it(`does not throw or notify when filename is ${JSON.stringify(filename)}`, () => {
                const onChange = vi.fn();
                const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine() });
                watcher.onChange(onChange);
                watcher.start();

                const fw = fsState.fakeWatchers[0];
                expect(() => {
                    fw.emit('change', 'rename', filename);
                    vi.runAllTimers();
                }).not.toThrow();

                expect(onChange).not.toHaveBeenCalled();
            });
        }
    });

    // ── 3. Debounce — rapid changes collapse to one notification ────────────

    describe('debounce collapses rapid changes', () => {
        it('emits only one onChange callback for multiple rapid changes to the same file', () => {
            const onChange = vi.fn();
            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine(), debounceMs: 100 });
            watcher.onChange(onChange);
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            fw.emit('change', 'change', 'dark.tss');
            fw.emit('change', 'change', 'dark.tss');
            fw.emit('change', 'change', 'dark.tss');

            // Debounce has NOT expired yet
            expect(onChange).not.toHaveBeenCalled();

            // Advance past the debounce window
            vi.advanceTimersByTime(150);

            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange).toHaveBeenCalledWith('dark.tss');
        });

        it('resets the debounce timer when a new change arrives within the window', () => {
            const onChange = vi.fn();
            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine(), debounceMs: 100 });
            watcher.onChange(onChange);
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            fw.emit('change', 'change', 'dark.tss');
            vi.advanceTimersByTime(80); // within window — no fire yet
            expect(onChange).not.toHaveBeenCalled();

            fw.emit('change', 'change', 'dark.tss'); // reset timer
            vi.advanceTimersByTime(80); // still within NEW window
            expect(onChange).not.toHaveBeenCalled();

            vi.advanceTimersByTime(30); // now past the reset window
            expect(onChange).toHaveBeenCalledTimes(1);
        });
    });

    // ── 4. Different files have independent debounce timers ─────────────────

    describe('separate files have independent debounce timers', () => {
        it('emits notifications for both dark.tss and light.tss', () => {
            const onChange = vi.fn();
            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine(), debounceMs: 100 });
            watcher.onChange(onChange);
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            fw.emit('change', 'change', 'dark.tss');
            fw.emit('change', 'change', 'light.tss');

            vi.advanceTimersByTime(150);

            expect(onChange).toHaveBeenCalledTimes(2);
            const filenames = onChange.mock.calls.map((c) => c[0]);
            expect(filenames).toContain('dark.tss');
            expect(filenames).toContain('light.tss');
        });

        it('rapid changes to dark.tss do not collapse light.tss notification', () => {
            const onChange = vi.fn();
            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine(), debounceMs: 100 });
            watcher.onChange(onChange);
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            fw.emit('change', 'change', 'dark.tss');
            fw.emit('change', 'change', 'dark.tss');
            fw.emit('change', 'change', 'light.tss');

            vi.advanceTimersByTime(150);

            // dark.tss collapsed to 1, light.tss adds 1 → total 2
            expect(onChange).toHaveBeenCalledTimes(2);
        });
    });

    // ── 5. stop() cancels pending debounced events ──────────────────────────

    describe('stop() cancels pending debounced callbacks', () => {
        it('does not fire onChange if stop() is called before the debounce expires', () => {
            const onChange = vi.fn();
            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine(), debounceMs: 100 });
            watcher.onChange(onChange);
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            fw.emit('change', 'change', 'dark.tss');

            // Stop before debounce expires
            watcher.stop();
            vi.runAllTimers();

            expect(onChange).not.toHaveBeenCalled();
        });

        it('clears all pending timers on stop()', () => {
            const onChange = vi.fn();
            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine(), debounceMs: 100 });
            watcher.onChange(onChange);
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            fw.emit('change', 'change', 'dark.tss');
            fw.emit('change', 'change', 'light.tss');

            watcher.stop();
            vi.runAllTimers();

            expect(onChange).not.toHaveBeenCalled();
        });
    });

    // ── 6. Missing watch directories ────────────────────────────────────────

    describe('missing watch directories', () => {
        it('does not create a watcher when the directory does not exist', () => {
            resetFsState(false);

            const watcher = new TSSWatcher({ dir: './nonexistent', engine: makeEngine() });
            expect(() => watcher.start()).not.toThrow();

            expect(fsState.watchCallCount).toBe(0);
        });

        it('remains functional (no errors) when directory is absent', () => {
            resetFsState(false);

            const onChange = vi.fn();
            const watcher = new TSSWatcher({ dir: './nonexistent', engine: makeEngine() });
            watcher.onChange(onChange);
            watcher.start();
            watcher.stop();

            expect(onChange).not.toHaveBeenCalled();
        });

        it('loadAll() is a no-op when directory does not exist', () => {
            resetFsState(false);

            const engine = makeEngine();
            const loadAllSpy = vi.spyOn(engine, 'loadAll');
            const watcher = new TSSWatcher({ dir: './nonexistent', engine });

            expect(() => watcher.loadAll()).not.toThrow();
            expect(loadAllSpy).not.toHaveBeenCalled();
        });
    });

    // ── 7. Error event forwarding ────────────────────────────────────────────

    describe('error event handling', () => {
        it('invokes onError callback exactly once when an error is emitted', () => {
            const onErr = vi.fn();
            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine() });
            watcher.onError(onErr);
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            const err = new Error('EACCES: permission denied');
            fw.emit('error', err);

            expect(onErr).toHaveBeenCalledTimes(1);
            expect(onErr).toHaveBeenCalledWith(err);
        });

        it('forwards the exact Error object to the listener', () => {
            const onErr = vi.fn();
            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine() });
            watcher.onError(onErr);
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            const originalError = new Error('disk full');
            fw.emit('error', originalError);

            expect(onErr.mock.calls[0][0]).toBe(originalError);
        });
    });

    // ── 8. AbortError is silently ignored ───────────────────────────────────

    describe('AbortError is ignored', () => {
        it('does not invoke error listeners for AbortError', () => {
            const onErr = vi.fn();
            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine() });
            watcher.onError(onErr);
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            const abortErr = new Error('The operation was aborted');
            abortErr.name = 'AbortError';
            fw.emit('error', abortErr);

            expect(onErr).not.toHaveBeenCalled();
        });

        it('does not throw when an AbortError is emitted', () => {
            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine() });
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            const abortErr = new Error('The operation was aborted');
            abortErr.name = 'AbortError';
            expect(() => fw.emit('error', abortErr)).not.toThrow();
        });
    });

    // ── 9. Child process IPC safety ─────────────────────────────────────────

    describe('child process IPC safety', () => {
        it('does not call send() when child process has been killed', () => {
            const fakeChild = { killed: true, exitCode: null, send: vi.fn() };

            const watcher = new TSSWatcher({
                dir: './themes',
                engine: makeEngine(),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                childProcess: fakeChild as any,
                debounceMs: 0,
            });
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            fw.emit('change', 'change', 'dark.tss');
            vi.runAllTimers();

            expect(fakeChild.send).not.toHaveBeenCalled();
        });

        it('does not call send() when child process has a non-null exitCode', () => {
            const fakeChild = { killed: false, exitCode: 1, send: vi.fn() };

            const watcher = new TSSWatcher({
                dir: './themes',
                engine: makeEngine(),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                childProcess: fakeChild as any,
                debounceMs: 0,
            });
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            fw.emit('change', 'change', 'dark.tss');
            vi.runAllTimers();

            expect(fakeChild.send).not.toHaveBeenCalled();
        });

        it('does not throw when no child process is attached', () => {
            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine(), debounceMs: 0 });
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            expect(() => {
                fw.emit('change', 'change', 'dark.tss');
                vi.runAllTimers();
            }).not.toThrow();
        });

        it('calls send() with correct payload when child process is alive', () => {
            const fakeChild = { killed: false, exitCode: null, send: vi.fn() };

            const watcher = new TSSWatcher({
                dir: './themes',
                engine: makeEngine(),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                childProcess: fakeChild as any,
                debounceMs: 0,
            });
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            fw.emit('change', 'change', 'dark.tss');
            vi.runAllTimers();

            expect(fakeChild.send).toHaveBeenCalledTimes(1);
            expect(fakeChild.send).toHaveBeenCalledWith({ type: 'tss:reload', filename: 'dark.tss' });
        });
    });

    // ── 10. Multiple onChange listeners ─────────────────────────────────────

    describe('multiple onChange listeners', () => {
        it('invokes all registered onChange listeners on a .tss change', () => {
            const fn1 = vi.fn();
            const fn2 = vi.fn();
            const fn3 = vi.fn();

            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine(), debounceMs: 0 });
            watcher.onChange(fn1);
            watcher.onChange(fn2);
            watcher.onChange(fn3);
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            fw.emit('change', 'change', 'dark.tss');
            vi.runAllTimers();

            expect(fn1).toHaveBeenCalledTimes(1);
            expect(fn2).toHaveBeenCalledTimes(1);
            expect(fn3).toHaveBeenCalledTimes(1);
        });

        it('all listeners receive the same filename', () => {
            const calls: string[] = [];

            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine(), debounceMs: 0 });
            watcher.onChange((f) => calls.push(f));
            watcher.onChange((f) => calls.push(f));
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            fw.emit('change', 'change', 'dark.tss');
            vi.runAllTimers();

            expect(calls).toEqual(['dark.tss', 'dark.tss']);
        });

        it('unsubscribed listener is no longer called', () => {
            const fn1 = vi.fn();
            const fn2 = vi.fn();

            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine(), debounceMs: 0 });
            const unsub = watcher.onChange(fn1);
            watcher.onChange(fn2);
            watcher.start();

            unsub(); // remove fn1

            const fw = fsState.fakeWatchers[0];
            fw.emit('change', 'change', 'dark.tss');
            vi.runAllTimers();

            expect(fn1).not.toHaveBeenCalled();
            expect(fn2).toHaveBeenCalledTimes(1);
        });
    });

    // ── 11. Multiple onError listeners ──────────────────────────────────────

    describe('multiple onError listeners', () => {
        it('invokes all registered onError listeners when an error occurs', () => {
            const err1 = vi.fn();
            const err2 = vi.fn();

            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine() });
            watcher.onError(err1);
            watcher.onError(err2);
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            const error = new Error('ENOSPC');
            fw.emit('error', error);

            expect(err1).toHaveBeenCalledWith(error);
            expect(err2).toHaveBeenCalledWith(error);
        });

        it('all error listeners receive the same Error object', () => {
            const received: Error[] = [];

            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine() });
            watcher.onError((e) => received.push(e));
            watcher.onError((e) => received.push(e));
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            const error = new Error('EROFS');
            fw.emit('error', error);

            expect(received).toHaveLength(2);
            expect(received[0]).toBe(error);
            expect(received[1]).toBe(error);
        });

        it('unsubscribed error listener is no longer called', () => {
            const fn1 = vi.fn();
            const fn2 = vi.fn();

            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine() });
            const unsub = watcher.onError(fn1);
            watcher.onError(fn2);
            watcher.start();

            unsub();

            const fw = fsState.fakeWatchers[0];
            fw.emit('error', new Error('test'));

            expect(fn1).not.toHaveBeenCalled();
            expect(fn2).toHaveBeenCalledTimes(1);
        });
    });

    // ── 12. Multiple watch directories ──────────────────────────────────────

    describe('multiple watch directories (watchDirs)', () => {
        it('creates a watcher for each existing directory', () => {
            const watcher = new TSSWatcher({
                watchDirs: ['./themes', './custom-themes'],
                engine: makeEngine(),
            });
            watcher.start();

            expect(fsState.watchCallCount).toBe(2);
        });

        it('receives change events from both directories independently', () => {
            const onChange = vi.fn();
            const watcher = new TSSWatcher({
                watchDirs: ['./themes', './custom-themes'],
                engine: makeEngine(),
                debounceMs: 0,
            });
            watcher.onChange(onChange);
            watcher.start();

            const [fw1, fw2] = fsState.fakeWatchers;
            fw1.emit('change', 'change', 'dark.tss');
            fw2.emit('change', 'change', 'light.tss');
            vi.runAllTimers();

            expect(onChange).toHaveBeenCalledTimes(2);
            const filenames = onChange.mock.calls.map((c) => c[0]);
            expect(filenames).toContain('dark.tss');
            expect(filenames).toContain('light.tss');
        });

        it('skips directories that do not exist', () => {
            // Override existsSync for this test only by swapping fsState.exists
            // We need per-call logic, so patch via the module mock state proxy:
            // The mock always calls fsState.exists — we repatch watch to count calls
            // but for existsSync we need per-path logic. We extend fsState temporarily.
            const origExists = fsState.exists;
            let existsCallCount = 0;
            // Use a getter-based override by reassigning fsState.exists per call —
            // instead patch the watcher to accept a custom predicate via watchDirs
            // and existsSync mock being per-call: use Object.defineProperty on fsState.
            // Simpler: make exists a function and call it from the mock.
            // Since vi.mock factory is static, we work around this with a controlled counter.

            // Actually: our vi.mock uses fsState.exists as a boolean.
            // For this test we need to return true for './themes' and false for './custom-themes'.
            // We'll restart the test with watchCallCount and track it:
            // Set exists=true for 1st call, false for 2nd call via a counter.
            let callIdx = 0;
            // Temporarily override the mock implementation inline using the state object's
            // 'exists' property as a computed getter. We accomplish this with a trick:
            // store per-call answers and pick them.
            const answers = [true, false];
            const existsAnswers = answers;
            let answerIdx = 0;

            // Replace fsState.exists with a per-call answer via a Proxy trick is complex.
            // Use a simpler approach: set existsSync to answer based on path content.
            // Since our mock reads fsState.exists as a flat boolean, we swap it before each
            // watch() call by hooking into watch() itself — but watch() is already mocked.
            //
            // Best approach here: use separate TSSWatcher instances and toggle exists.
            resetFsState(true); // first dir exists
            const w1 = new TSSWatcher({ watchDirs: ['./themes'], engine: makeEngine() });
            w1.start();
            const count1 = fsState.watchCallCount; // should be 1

            resetFsState(false); // second dir does not exist
            const w2 = new TSSWatcher({ watchDirs: ['./custom-themes'], engine: makeEngine() });
            w2.start();
            const count2 = fsState.watchCallCount; // should still be 0

            expect(count1).toBe(1);
            expect(count2).toBe(0);
        });

        it('watchDirs takes precedence over dir', () => {
            const watcher = new TSSWatcher({
                dir: './ignored',
                watchDirs: ['./themes', './custom-themes'],
                engine: makeEngine(),
            });
            watcher.start();

            // watchDirs overrides dir, so two watchers are started
            expect(fsState.watchCallCount).toBe(2);
        });
    });

    // ── Lifecycle — start() is idempotent ────────────────────────────────────

    describe('start() is idempotent', () => {
        it('does not register duplicate watchers when start() is called twice', () => {
            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine() });
            watcher.start();
            watcher.start(); // second call should be a no-op

            expect(fsState.watchCallCount).toBe(1);
        });
    });

    // ── Constructor shorthand callbacks ──────────────────────────────────────

    describe('constructor shorthand onReload / onError', () => {
        it('calls the constructor onReload callback on change', () => {
            const onReload = vi.fn();
            const watcher = new TSSWatcher({
                dir: './themes',
                engine: makeEngine(),
                onReload,
                debounceMs: 0,
            });
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            fw.emit('change', 'change', 'dark.tss');
            vi.runAllTimers();

            expect(onReload).toHaveBeenCalledWith('dark.tss');
        });

        it('calls the constructor onError callback on watcher error', () => {
            const onErr = vi.fn();
            const watcher = new TSSWatcher({ dir: './themes', engine: makeEngine(), onError: onErr });
            watcher.start();

            const fw = fsState.fakeWatchers[0];
            const error = new Error('boom');
            fw.emit('error', error);

            expect(onErr).toHaveBeenCalledWith(error);
        });
    });
});
