// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for Terminal adapter
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
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
