import { describe, it, expect } from 'vitest';
import { Terminal } from './Terminal.js';
import { Screen } from './Screen.js';
import { Renderer } from './Renderer.js';

interface FakeStdout {
    writes: string;
    columns: number;
    rows: number;
    isTTY: boolean;
    write(data: string): void;
    on(event: string, listener: (...args: unknown[]) => void): void;
    once(event: string, listener: (...args: unknown[]) => void): void;
    off(event: string, listener: (...args: unknown[]) => void): void;
}

interface FakeStdin {
    isTTY: boolean;
    setRawMode(mode: boolean): void;
    resume(): void;
    pause(): void;
    on(event: string, listener: (...args: unknown[]) => void): void;
    off(event: string, listener: (...args: unknown[]) => void): void;
}

// Regression: ensure a resize does not leave stale style fingerprints
// that would make the renderer skip redrawing rows after a resize.

describe('Renderer — resize does not suppress redraw via stale style fingerprints', () => {
    it('renders after resize (no stale-style suppression)', () => {
        // fake stdout to capture writes
        const fakeStdout: FakeStdout = {
            writes: '',
            columns: 80,
            rows: 24,
            isTTY: true,
            write(s: string) { this.writes += s; },
            on() {},
            once() {},
            off() {},
        };
        const fakeStdin: FakeStdin = {
            isTTY: true,
            setRawMode() {},
            resume() {},
            pause() {},
            on() {},
            off() {},
        };

        const terminal = new Terminal({ stdout: fakeStdout, stdin: fakeStdin });
        const screen = new Screen(40, 5);

        // Use non-diff renderer to exercise the getPreviousLine/getPreviousStyleLine path
        const renderer = new Renderer(terminal, screen, 60, false);

        // 1) Write a line and render — establish an initial state
        screen.writeString(0, 0, 'Saved');
        renderer.renderNow();
        const beforeWrites = fakeStdout.writes.length;

        // 2) Resize the screen (this clears previousLines but not previousStyleLines)
        screen.resize(40, 5);

        // 3) Write new content and render again
        screen.writeString(0, 0, 'After');
        renderer.renderNow();
        const afterOutput = fakeStdout.writes.slice(beforeWrites);

        // Expect the second render to include the new text, not just wrapper output.
        expect(afterOutput).toContain('After');
    });
});
