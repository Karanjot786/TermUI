import { describe, expect, it } from 'vitest';
import { Terminal } from '../terminal/Terminal.js';
import { LiveRender } from './live-render.js';
import { Screen } from '../terminal/Screen.js';


interface FakeStdout {
    writes: string;
    columns: number;
    rows: number;
    isTTY: boolean;
    write(s: string): boolean;
    on(): void;
    off(): void;
    once(): void;
}

interface FakeStdin {
    isTTY: boolean;
    setRawMode(): void;
    resume(): void;
    pause(): void;
    on(): void;
    off(): void;
}

describe('LiveRender', () => {
   function createTestContext() {
    const fakeStdout: FakeStdout = {
        writes: '',
        columns: 80,
        rows: 24,
        isTTY: true,
        write(s: string) {
            this.writes += s;
            return true;
        },
        on() {},
        off() {},
        once() {},
    };

    const fakeStdin: FakeStdin = {
        isTTY: true,
        setRawMode() {},
        resume() {},
        pause() {},
        on() {},
        off() {},
    };

    const terminal = new Terminal({
        stdout: fakeStdout as unknown as NodeJS.WriteStream,
        stdin: fakeStdin as unknown as NodeJS.ReadStream,
    });

    const screen = new Screen(80, 24);
    const live = new LiveRender(terminal, screen);

    return {
        fakeStdout,
        fakeStdin,
        terminal,
        screen,
        live,
    };
}
    it('does not emit clearScreen sequences', () => {
        const { fakeStdout, terminal, live } = createTestContext();
        live.render('hello');
        live.render('world');

        expect(fakeStdout.writes).not.toContain('\x1b[2J');

        terminal.restore();
    });
    it('emits clearLine sequences based on previous render height', () => {
    const { fakeStdout, terminal, live } = createTestContext();

    live.render('A\nB\nC');
    fakeStdout.writes = '';

    live.render('X\nY\nZ');

    const clearLineCount =
        (fakeStdout.writes.match(/\x1b\[2K/g) ?? []).length;

    expect(clearLineCount).toBe(3);

    terminal.restore();
    });

    it('moves cursor up by previous render height', () => {
    const { fakeStdout, terminal, live } = createTestContext();

    live.render('A\nB\nC');
    fakeStdout.writes = '';

    live.render('X\nY\nZ');

    expect(fakeStdout.writes).toContain('\x1b[3A');

    terminal.restore();
    });
    it('stores zero height for empty frames', () => {
    const { terminal, screen, live } = createTestContext();
    live.render('');

    expect(screen.lastRenderedHeight).toBe(0);

    terminal.restore();
});
});
