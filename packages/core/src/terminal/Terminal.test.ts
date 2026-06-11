// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for Terminal adapter
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { Terminal } from './Terminal.js';
import { bell, notify } from '../utils/ansi.js';

function createFakeStdout() {
    return {
        write: vi.fn(() => true),
        columns: 80,
        rows: 24,
        on: vi.fn(),
        off: vi.fn()
    } as unknown as NodeJS.WriteStream;
}

describe('Terminal', () => {
    it('bell() writes BEL', () => {
        const stdout = createFakeStdout();
        const terminal = new Terminal({ stdout });

        terminal.bell();

        expect(stdout.write).toHaveBeenCalledWith('\x07');
    });

    it('notify("Done") writes an OSC 9 notification containing Done', () => {
        const stdout = createFakeStdout();
        const terminal = new Terminal({ stdout });

        terminal.notify('Done');

        expect(stdout.write).toHaveBeenCalledWith('\x1b]9;Done\x07');
    });

    it('notify("Build", "ok") writes an OSC 9 notification containing both title and body', () => {
        const stdout = createFakeStdout();
        const terminal = new Terminal({ stdout });

        terminal.notify('Build', 'ok');

        expect(stdout.write).toHaveBeenCalledWith('\x1b]9;Build: ok\x07');
    });
});

describe('ansi helpers', () => {
    it('bell constant equals BEL control byte', () => {
        expect(bell).toBe('\x07');
    });

    it('notify("hi") returns OSC 9 notification sequence', () => {
        expect(notify('hi')).toBe('\x1b]9;hi\x07');
    });
});

describe('Terminal', () => {

    describe('Resize Debouncing & Deduplication', () => {
        let term: Terminal;
        let fakeStdout: EventEmitter & { columns: number; rows: number; write: any };

        beforeEach(() => {
            vi.useFakeTimers();
            
            // Create a fake stdout to drive the resize events safely without mutating global process
            fakeStdout = Object.assign(new EventEmitter(), {
                columns: 80,
                rows: 24,
                write: vi.fn()
            });
            
            term = new Terminal({ 
                stdout: fakeStdout as unknown as NodeJS.WriteStream,
                resizeDebounceMs: 16 
            });
        });

        afterEach(() => {
            vi.restoreAllMocks();
            vi.useRealTimers();
            term.restore();
        });

        it('three quick resizes fire one handler call and use the final size', () => {
            const handler = vi.fn();
            term.onResize(handler);

            // 1st resize
            fakeStdout.columns = 100;
            fakeStdout.rows = 40;
            fakeStdout.emit('resize');

            // 2nd resize
            fakeStdout.columns = 120;
            fakeStdout.rows = 50;
            fakeStdout.emit('resize');

            // 3rd resize (Final)
            fakeStdout.columns = 140;
            fakeStdout.rows = 60;
            fakeStdout.emit('resize');

            // Handler should not be called immediately due to debounce
            expect(handler).not.toHaveBeenCalled();
            
            // Getters should reflect the latest size immediately
            expect(term.cols).toBe(140);
            expect(term.rows).toBe(60);

            // Advance time past the 16ms debounce window
            vi.advanceTimersByTime(16);

            // Expect a single call with the final dimensions
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(140, 60);
        });

        it('a resize to the same dims as the last dispatch is skipped', () => {
            const handler = vi.fn();
            term.onResize(handler);

            // Initial resize
            fakeStdout.columns = 100;
            fakeStdout.rows = 40;
            fakeStdout.emit('resize');
            vi.advanceTimersByTime(16);
            expect(handler).toHaveBeenCalledTimes(1);

            handler.mockClear();

            // Emit resize again but with the SAME dimensions
            fakeStdout.emit('resize');
            vi.advanceTimersByTime(16);

            // Handler should be skipped because dims didn't change
            expect(handler).not.toHaveBeenCalled();
        });

        it('the timer is cleared on restore()', () => {
            const handler = vi.fn();
            term.onResize(handler);

            // Trigger a resize
            fakeStdout.columns = 200;
            fakeStdout.rows = 80;
            fakeStdout.emit('resize');

            // Call restore before the debounce window completes
            term.restore();

            // Advance time
            vi.advanceTimersByTime(16);

            // Handler should never fire because the timer was cleared
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('Reentrant restore', () => {
        let term: Terminal;
        let fakeStdout: EventEmitter & { columns: number; rows: number; write: any };

        beforeEach(() => {
            vi.useFakeTimers();
            fakeStdout = Object.assign(new EventEmitter(), {
                columns: 80,
                rows: 24,
                write: vi.fn()
            });
            term = new Terminal({
                stdout: fakeStdout as unknown as NodeJS.WriteStream,
                resizeDebounceMs: 16
            });
        });

        afterEach(() => {
            vi.restoreAllMocks();
            vi.useRealTimers();
            try { term.restore(); } catch { /* already restored */ }
        });

        it('reentrant restore from cleanup handler does not stack overflow', () => {
            const handler = vi.fn(() => { term.restore(); });
            term.onCleanup(handler);
            // Run cleanup handlers directly to simulate the exit handler path
            const cleanupFns = (term as any)._cleanupHandlers;
            for (const fn of [...cleanupFns]) { fn(); }
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('reentrant restore from resize handler is safe', () => {
            const handler = vi.fn(() => { term.restore(); });
            term.onResize(handler);
            // Trigger resize handler before restore completes
            term['_resizeHandlers']?.forEach((h: any) => h());
            expect(() => term.restore()).not.toThrow();
        });

        it('cleanup handler can remove itself without crashing', () => {
            const handler = vi.fn(() => {
                const arr = (term as any)._cleanupHandlers;
                const idx = arr.indexOf(handler);
                if (idx >= 0) arr.splice(idx, 1);
            });
            term.onCleanup(handler);
            const cleanupFns = (term as any)._cleanupHandlers;
            for (const fn of [...cleanupFns]) { fn(); }
            expect(handler).toHaveBeenCalledTimes(1);
            // Handler should have been removed
            expect((term as any)._cleanupHandlers.length).toBe(0);
        });

        it('_restoring is reset in finally when disableMouse throws', () => {
            const orig = term.disableMouse;
            term.disableMouse = () => { throw new Error('oops'); };
            try { term.restore(); } catch { /* expected */ }
            term.disableMouse = orig;
            expect((term as any)._restoring).toBe(false);
            // Subsequent restore should proceed
            expect(() => term.restore()).not.toThrow();
        });

        it('_restoring is reset in finally when exitRawMode throws', () => {
            const orig = term.exitRawMode;
            term.exitRawMode = () => { throw new Error('oops'); };
            try { term.restore(); } catch { /* expected */ }
            term.exitRawMode = orig;
            expect((term as any)._restoring).toBe(false);
            expect(() => term.restore()).not.toThrow();
        });

        it('_restoring guard prevents recursive restore call', () => {
            const spy = vi.fn();
            // Simulate the scenario: resize handler calls restore while restore is in progress
            // by accessing _restoring state directly
            (term as any)._restoring = true;
            term.restore();
            // restore returned immediately without doing anything
            expect((term as any)._restored).toBe(false);
        });
    });
});
