// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for ANSI escape sequence helpers
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import {
    CSI, OSC, ESC,
    hideCursor, showCursor, saveCursorPosition, restoreCursorPosition,
    moveTo, moveUp, moveDown, moveRight, moveLeft,
    clearScreen, clearLine, clearLineToEnd, clearLineToStart, clearDown, clearUp,
    enterAltScreen, exitAltScreen,
    beginSyncUpdate, endSyncUpdate,
    enableMouse, disableMouse,
    enableBracketedPaste, disableBracketedPaste,
    reset, bold, dim, italic, underline, blink, inverse, strikethrough,
    resetBold, resetDim, resetItalic, resetUnderline, resetBlink, resetInverse, resetStrikethrough,
    setScrollRegion, resetScrollRegion,
    setTitle, writeClipboard, readClipboard
} from './ansi.js';

class MockStdin extends EventEmitter {
    on(event: string, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    off(event: string, listener: (...args: any[]) => void): this {
        return super.off(event, listener);
    }
}

describe('ANSI Escape Constants', () => {
    it('should define core control prefixes', () => {
        expect(CSI).toBe('\x1b[');
        expect(OSC).toBe('\x1b]');
        expect(ESC).toBe('\x1b');
    });

    it('should define cursor control constants', () => {
        expect(hideCursor).toBe('\x1b[?25l');
        expect(showCursor).toBe('\x1b[?25h');
        expect(saveCursorPosition).toBe('\x1b[s');
        expect(restoreCursorPosition).toBe('\x1b[u');
    });

    it('should define screen control constants', () => {
        expect(clearScreen).toBe('\x1b[2J');
        expect(clearLine).toBe('\x1b[2K');
        expect(clearLineToEnd).toBe('\x1b[0K');
        expect(clearLineToStart).toBe('\x1b[1K');
        expect(clearDown).toBe('\x1b[J');
        expect(clearUp).toBe('\x1b[1J');
    });

    it('should define alternate screen buffer constants', () => {
        expect(enterAltScreen).toBe('\x1b[?1049h');
        expect(exitAltScreen).toBe('\x1b[?1049l');
    });

    it('should define synchronized output constants', () => {
        expect(beginSyncUpdate).toBe('\x1b[?2026h');
        expect(endSyncUpdate).toBe('\x1b[?2026l');
    });

    it('should define mouse tracking constants', () => {
        expect(enableMouse).toBe('\x1b[?1000h\x1b[?1002h\x1b[?1006h');
        expect(disableMouse).toBe('\x1b[?1000l\x1b[?1002l\x1b[?1006l');
    });

    it('should define bracketed paste constants', () => {
        expect(enableBracketedPaste).toBe('\x1b[?2004h');
        expect(disableBracketedPaste).toBe('\x1b[?2004l');
    });

    it('should define style styling constants', () => {
        expect(reset).toBe('\x1b[0m');
        expect(bold).toBe('\x1b[1m');
        expect(dim).toBe('\x1b[2m');
        expect(italic).toBe('\x1b[3m');
        expect(underline).toBe('\x1b[4m');
        expect(blink).toBe('\x1b[5m');
        expect(inverse).toBe('\x1b[7m');
        expect(strikethrough).toBe('\x1b[9m');
    });

    it('should define style reset constants', () => {
        expect(resetBold).toBe('\x1b[22m');
        expect(resetDim).toBe('\x1b[22m');
        expect(resetItalic).toBe('\x1b[23m');
        expect(resetUnderline).toBe('\x1b[24m');
        expect(resetBlink).toBe('\x1b[25m');
        expect(resetInverse).toBe('\x1b[27m');
        expect(resetStrikethrough).toBe('\x1b[29m');
    });
});

describe('ANSI Cursor Helper Functions', () => {
    it('should format moveTo sequence correctly (1-based indices)', () => {
        expect(moveTo(0, 0)).toBe('\x1b[1;1H');
        expect(moveTo(4, 9)).toBe('\x1b[10;5H');
        expect(moveTo(79, 23)).toBe('\x1b[24;80H');
    });

    it('should format moveUp sequence correctly', () => {
        expect(moveUp()).toBe('\x1b[1A');
        expect(moveUp(5)).toBe('\x1b[5A');
    });

    it('should format moveDown sequence correctly', () => {
        expect(moveDown()).toBe('\x1b[1B');
        expect(moveDown(8)).toBe('\x1b[8B');
    });

    it('should format moveRight sequence correctly', () => {
        expect(moveRight()).toBe('\x1b[1C');
        expect(moveRight(12)).toBe('\x1b[12C');
    });

    it('should format moveLeft sequence correctly', () => {
        expect(moveLeft()).toBe('\x1b[1D');
        expect(moveLeft(3)).toBe('\x1b[3D');
    });
});

describe('ANSI Scrolling Region Functions', () => {
    it('should format setScrollRegion correctly (1-based indices)', () => {
        expect(setScrollRegion(0, 23)).toBe('\x1b[1;24r');
        expect(setScrollRegion(2, 10)).toBe('\x1b[3;11r');
    });

    it('should define resetScrollRegion', () => {
        expect(resetScrollRegion).toBe('\x1b[r');
    });
});

describe('ANSI Title Functions', () => {
    it('should format setTitle correctly', () => {
        expect(setTitle('My App')).toBe('\x1b]0;My App\x07');
        expect(setTitle('')).toBe('\x1b]0;\x07');
    });
});

describe('ANSI Clipboard Functions', () => {
    it('should write base64 encoded text to system clipboard via OSC 52', () => {
        const mockWrite = vi.fn();
        const mockStdout = {
            write: mockWrite,
        } as unknown as NodeJS.WriteStream;

        const testText = 'Hello GSSoC 2026!';
        writeClipboard(testText, mockStdout);

        const expectedBase64 = Buffer.from(testText, 'utf8').toString('base64');
        const expectedSequence = `\x1b]52;c;${expectedBase64}\x07`;

        expect(mockWrite).toHaveBeenCalledTimes(1);
        expect(mockWrite).toHaveBeenCalledWith(expectedSequence);
    });

    it('reads clipboard text from OSC 52 response', async () => {
        const stdin = new MockStdin() as any;

        let written = '';
        const stdout = {
            write(data: string) {
                written += data;
                return true;
            },
        } as any;

        const promise = readClipboard(stdin, stdout);

        expect(written).toBe('\x1b]52;c;?\x07');

        stdin.emit(
            'data',
            Buffer.from('\x1b]52;c;aGVsbG8=\x07')
        );

        await expect(promise).resolves.toBe('hello');
    });
});
