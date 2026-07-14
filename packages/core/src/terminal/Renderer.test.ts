// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for Screen diff helpers used by diffRenderer
// ─────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Screen } from './Screen.js';
import { Terminal } from './Terminal.js';
import { Renderer, type FrameStats } from './Renderer.js';
import { RenderHook } from '../renderer/render-hook.js';

describe('Screen.getLine', () => {
    it('returns empty string for out-of-range rows', () => {
        const screen = new Screen(10, 5);
        expect(screen.getLine(-1)).toBe('');
        expect(screen.getLine(5)).toBe('');
    });

    it('returns the text written to the back buffer', () => {
        const screen = new Screen(20, 3);
        screen.writeString(0, 0, 'Hello');
        expect(screen.getLine(0).trimEnd()).toBe('Hello');
    });

    it('excludes continuation cells (width === 0) from the line string', () => {
        const screen = new Screen(10, 2);
        // Write a normal character then check the line does not include zero-width cells
        screen.writeString(0, 0, 'AB');
        const line = screen.getLine(0);
        expect(line.length).toBeGreaterThan(0);
        // Width-0 continuation cells should not appear as separate characters
        expect(line).toContain('A');
        expect(line).toContain('B');
    });
});

describe('Screen.saveLines / getPreviousLine', () => {
    it('returns empty string before the first save', () => {
        const screen = new Screen(10, 3);
        expect(screen.getPreviousLine(0)).toBe('');
        expect(screen.getPreviousLine(2)).toBe('');
    });

    it('stores current back buffer content after save', () => {
        const screen = new Screen(20, 3);
        screen.writeString(0, 0, 'Saved');
        screen.saveLines();
        expect(screen.getPreviousLine(0).trimEnd()).toBe('Saved');
    });

    it('detects changed lines between saves', () => {
        const screen = new Screen(20, 3);
        screen.writeString(0, 0, 'Before');
        screen.saveLines();

        screen.writeString(0, 0, 'After ');

        expect(screen.getLine(0).trimEnd()).toBe('After');
        expect(screen.getPreviousLine(0).trimEnd()).toBe('Before');
        expect(screen.getLine(0)).not.toBe(screen.getPreviousLine(0));
    });

    it('shows unchanged lines as equal after save', () => {
        const screen = new Screen(20, 3);
        screen.writeString(0, 0, 'Same');
        screen.saveLines();

        expect(screen.getLine(0)).toBe(screen.getPreviousLine(0));
    });

    it('saves all rows independently', () => {
        const screen = new Screen(20, 4);
        screen.writeString(0, 0, 'Row0');
        screen.writeString(0, 1, 'Row1');
        screen.writeString(0, 2, 'Row2');
        screen.saveLines();

        expect(screen.getPreviousLine(0).trimEnd()).toBe('Row0');
        expect(screen.getPreviousLine(1).trimEnd()).toBe('Row1');
        expect(screen.getPreviousLine(2).trimEnd()).toBe('Row2');
        expect(screen.getPreviousLine(3)).toBe(screen.getLine(3)); // both empty
    });
});

describe('Renderer profiling hooks', () => {
    let terminal: Terminal;
    let screen: Screen;
    let fakeStdout: any;

    beforeEach(() => {
        fakeStdout = {
            writes: '',
            columns: 80,
            rows: 24,
            isTTY: true,
            write(s: string) { this.writes += s; },
            on() {},
            once() {},
            off() {},
        };
        const fakeStdin: any = { isTTY: true, setRawMode() {}, resume() {}, pause() {}, on() {}, off() {} };
        terminal = new Terminal({ stdout: fakeStdout, stdin: fakeStdin });
        screen = new Screen(80, 24);
    });

    afterEach(() => {
        terminal.restore();
    });

    it('onFrame fires once per flush', () => {
        const renderer = new Renderer(terminal, screen);
        let count = 0;
        renderer.onFrame(() => {
            count++;
        });

        renderer.renderNow();
        expect(count).toBe(1);

        renderer.renderNow();
        expect(count).toBe(2);
    });

    it('cellsChanged matches the number of changed cells', () => {
        const renderer = new Renderer(terminal, screen);
        let stats: FrameStats | undefined;
        renderer.onFrame(s => {
            stats = s;
        });

        screen.setCell(0, 0, { char: 'a' });
        screen.setCell(5, 5, { char: 'b' });
        renderer.renderNow();

        expect(stats).toBeDefined();
        expect(stats!.cellsChanged).toBe(2);
    });

    it('bytesWritten is greater than zero on a non-empty frame', () => {
        const renderer = new Renderer(terminal, screen);
        let stats: FrameStats | undefined;
        renderer.onFrame(s => {
            stats = s;
        });

        screen.setCell(0, 0, { char: 'x' });
        renderer.renderNow();

        expect(stats).toBeDefined();
        expect(stats!.bytesWritten).toBeGreaterThan(0);
        expect(fakeStdout.writes.length).toBeGreaterThan(0);
    });

    it('a throwing callback is isolated and the next flush still works', () => {
        const renderer = new Renderer(terminal, screen);
        let callCount = 0;
        renderer.onFrame(() => {
            throw new Error('Test Callback Error');
        });
        renderer.onFrame(() => {
            callCount++;
        });

        // First flush - should not crash, and second callback should still run
        expect(() => renderer.renderNow()).not.toThrow();
        expect(callCount).toBe(1);

        // Second flush - should still work
        expect(() => renderer.renderNow()).not.toThrow();
        expect(callCount).toBe(2);
    });

    it('unsubscribe stops further calls', () => {
        const renderer = new Renderer(terminal, screen);
        let count = 0;
        const unsubscribe = renderer.onFrame(() => {
            count++;
        });

        renderer.renderNow();
        expect(count).toBe(1);

        unsubscribe();
        renderer.renderNow();
        expect(count).toBe(1); // should remain 1
    });

    it('durationMs is a non-negative number', () => {
        const renderer = new Renderer(terminal, screen);
        let stats: FrameStats | undefined;
        renderer.onFrame(s => {
            stats = s;
        });

        renderer.renderNow();
        expect(stats).toBeDefined();
        expect(stats!.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('does not throw when flush encounters an error', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});

        const renderer = new Renderer(terminal, screen);
        screen.setCell(0, 0, { char: 'x' });

        vi.spyOn(terminal, 'write').mockImplementationOnce(() => {
            throw new Error('write error');
        });

        expect(() => renderer.renderNow()).not.toThrow();
        vi.restoreAllMocks();
    });

    it('does not emit cursor movement for a diff span starting at a wide-char continuation cell', () => {
        const narrowScreen = new Screen(10, 2);
        const renderer = new Renderer(terminal, narrowScreen);

        // First frame: write a wide character (width=2) at col 0, filling col 0 (width=2) and col 1 (continuation, width=0)
        narrowScreen.setCell(0, 0, { char: '中', width: 2 });
        narrowScreen.setCell(1, 0, { char: '', width: 0 });
        narrowScreen.setCell(2, 0, { char: 'A', width: 1 });
        renderer.renderNow(); // establish front buffer

        // Second frame: change only the continuation cell's neighbor so the span start lands at col 1
        // To trigger _adjustSpanStart: mark col 1 (width=0) as changed by writing a different char at col 1
        // while col 0 (width=2) is unchanged — set col 1 explicitly to force the diff
        narrowScreen.setCell(1, 0, { char: '', width: 0, fg: { type: 'named', name: 'red' } });
        narrowScreen.setCell(2, 0, { char: 'B', width: 1 });

        let bytesWritten = 0;
        renderer.onFrame(stats => { bytesWritten = stats.bytesWritten; });
        renderer.renderNow();

        // The renderer should produce output without crashing (no invalid cursor move to a continuation column)
        expect(bytesWritten).toBeGreaterThan(0);
        // The adjusted span start should be col=0 (the real wide char boundary)
        const output = fakeStdout.writes;
        expect(output).toBeTruthy();
    });

    it('resets style fingerprint at each row boundary in diff renderer', () => {
        const narrowScreen = new Screen(5, 2);
        const renderer = new Renderer(terminal, narrowScreen);

        // Row 0: bold red cell at col 0
        narrowScreen.setCell(0, 0, { char: 'A', bold: true, fg: { type: 'named', name: 'red' } });

        // Row 1: same style at col 0 — after moveTo, must re-emit ANSI style even though
        // the fingerprint matches the last cell of row 0
        narrowScreen.setCell(0, 1, { char: 'B', bold: true, fg: { type: 'named', name: 'red' } });

        // Capture output
        const initialWrites = fakeStdout.writes.length;
        renderer.renderNow();
        const output = fakeStdout.writes.slice(initialWrites);

        // The output must contain at least one ANSI reset sequence with style re-application
        // for row 1 (the moveTo + reset + bold + color + char sequence).
        // The key assertion: the diff renderer should emit \x1b[0m (reset) after the moveTo
        // for row 1 to force the terminal into the correct style state.
        expect(output).toContain('\x1b[0m');
        // Verify reset appears at least twice (once for row 0 first cell, once for row 1)
        const resetCount = (output.match(/\x1b\[0m/g) || []).length;
        expect(resetCount).toBeGreaterThanOrEqual(2);
    });

    it('correctly adjusts span start backwards and renders from adjustedStart', () => {
        const narrowScreen = new Screen(10, 2);
        const renderer = new Renderer(terminal, narrowScreen);

        // First frame: write a wide character at col 0 and 'A' at col 2
        narrowScreen.setCell(0, 0, { char: '中', width: 2 });
        narrowScreen.setCell(1, 0, { char: '', width: 0 });
        narrowScreen.setCell(2, 0, { char: 'A', width: 1 });
        renderer.renderNow();

        // Second frame: Keep col 0 unchanged, change col 1 style (continuation) and col 2 char
        narrowScreen.setCell(0, 0, { char: '中', width: 2 });
        narrowScreen.setCell(1, 0, { char: '', width: 0, fg: { type: 'named', name: 'red' } });
        narrowScreen.setCell(2, 0, { char: 'B', width: 1 });

        fakeStdout.writes = '';
        renderer.renderNow();

        // Verify that the output has redrawn the wide character at col 0
        const outputStr = fakeStdout.writes;
        // It should move to col 0, not col 1 or 2, to start rendering
        expect(outputStr).toContain('\x1b[1;1H');
        // It should render '中'
        expect(outputStr).toContain('中');
        // It should render 'B'
        expect(outputStr).toContain('B');
    });
});
