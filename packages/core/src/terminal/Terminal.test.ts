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
});
