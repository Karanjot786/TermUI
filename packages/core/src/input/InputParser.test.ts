// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for InputParser
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { InputParser } from './InputParser.js';
import { createMockStdin, sendKey } from '../../../../tests/helpers/mock-stdin.js';

function createParser() {
    const stdin = createMockStdin();
    const parser = new InputParser(stdin);
    const handler = vi.fn();
    parser.onKey(handler);
    parser.start();
    return { stdin, parser, handler };
}

describe('InputParser', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('parses regular ASCII character "a"', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, 'a');
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'a', ctrl: false, alt: false }));
    });

    it('parses space (0x20) as "space"', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, Buffer.from([0x20]));
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'space' }));
    });

    it('parses enter (0x0D) as "enter"', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, Buffer.from([0x0D]));
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'enter' }));
    });

    it('parses tab (0x09) as "tab" without ctrl', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, Buffer.from([0x09]));
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'tab', ctrl: false }));
    });

    it('parses Ctrl+C (0x03) with ctrl=true', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, Buffer.from([0x03]));
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'c', ctrl: true }));
    });

    it('parses Arrow Up escape sequence', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, '\x1b[A');
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'up' }));
    });

    it('parses Arrow Down escape sequence', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, '\x1b[B');
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'down' }));
    });

    it('parses Arrow Right escape sequence', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, '\x1b[C');
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'right' }));
    });

    it('parses Arrow Left escape sequence', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, '\x1b[D');
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'left' }));
    });

    it('parses Home escape sequence', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, '\x1b[H');
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'home' }));
    });

    it('parses End escape sequence', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, '\x1b[F');
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'end' }));
    });

    it('parses Delete escape sequence', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, '\x1b[3~');
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'delete' }));
    });

    it('parses Backspace (0x7F)', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, Buffer.from([0x7F]));
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'backspace' }));
    });

    it('detects shift for uppercase characters', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, 'A');
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'A', shift: true }));
    });

    it('parses Alt+key (ESC followed by char)', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, '\x1bx');
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'x', alt: true }));
    });

    it('resolves cursor position reports with correct row/col', async () => {
        const stdin = createMockStdin();
        const parser = new InputParser(stdin);
        parser.start();

        const positionPromise = parser.requestCursorPosition();
        sendKey(stdin, '\x1b[12;34R');

        await expect(positionPromise).resolves.toEqual({ row: 12, col: 34 });
    });

    it('rejects cursor position request after timeout', async () => {
        vi.useFakeTimers();
        const stdin = createMockStdin();
        const parser = new InputParser(stdin);
        parser.start();

        const positionPromise = parser.requestCursorPosition(200);
        vi.advanceTimersByTime(201);

        await expect(positionPromise).rejects.toThrow('Cursor position request timed out');
    });

    it('rejects pending cursor position requests immediately when stop() is called', async () => {
        vi.useFakeTimers();
        const stdin = createMockStdin();
        const parser = new InputParser(stdin);
        parser.start();

        const positionPromise = parser.requestCursorPosition(200);
        parser.stop();

        await expect(positionPromise).rejects.toThrow('InputParser stopped');
    });

    it('does not emit a key event for cursor position reports', async () => {
        const stdin = createMockStdin();
        const parser = new InputParser(stdin);
        const keyHandler = vi.fn();
        parser.onKey(keyHandler);
        parser.start();

        const positionPromise = parser.requestCursorPosition();
        sendKey(stdin, '\x1b[5;7R');

        await expect(positionPromise).resolves.toEqual({ row: 5, col: 7 });
        expect(keyHandler).not.toHaveBeenCalled();
    });

    it('resolves two pending cursor position requests', async () => {
        const stdin = createMockStdin();
        const parser = new InputParser(stdin);
        parser.start();

        const first = parser.requestCursorPosition();
        const second = parser.requestCursorPosition();
        sendKey(stdin, '\x1b[8;9R');

        await expect(Promise.all([first, second])).resolves.toEqual([
            { row: 8, col: 9 },
            { row: 8, col: 9 },
        ]);
    });

    it('emits focus in for \x1b[I', () => {
        const { stdin, parser } = createParser();
        const focusHandler = vi.fn();
        parser.onFocusChange(focusHandler);

        sendKey(stdin, '\x1b[I');

        expect(focusHandler).toHaveBeenCalledWith(true);
        expect(focusHandler).toHaveBeenCalledTimes(1);
    });

    it('emits focus out for \x1b[O', () => {
        const { stdin, parser } = createParser();
        const focusHandler = vi.fn();
        parser.onFocusChange(focusHandler);

        sendKey(stdin, '\x1b[O');

        expect(focusHandler).toHaveBeenCalledWith(false);
        expect(focusHandler).toHaveBeenCalledTimes(1);
    });

    it('unsubscribes from focus events', () => {
        const { stdin, parser } = createParser();
        const focusHandler = vi.fn();
        const unsubscribe = parser.onFocusChange(focusHandler);
        unsubscribe();

        sendKey(stdin, '\x1b[I');

        expect(focusHandler).not.toHaveBeenCalled();
    });

    it('focus sequences do not become key events', () => {
        const { stdin, parser, handler } = createParser();
        const focusHandler = vi.fn();
        parser.onFocusChange(focusHandler);

        sendKey(stdin, '\x1b[I');
        sendKey(stdin, 'a');

        expect(focusHandler).toHaveBeenCalledWith(true);
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'a' }));
    });

    it('processes rapid multi-byte input correctly', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, 'abc');
        expect(handler).toHaveBeenCalledTimes(3);
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'a' }));
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'b' }));
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'c' }));
    });
    it('emits paste event for bracketed paste', () => {
        const stdin = createMockStdin();
        const parser = new InputParser(stdin);

        const pasteHandler = vi.fn();

        parser.onPaste(pasteHandler);
        parser.start();

        sendKey(stdin, '\x1b[200~hello world\x1b[201~');

        expect(pasteHandler).toHaveBeenCalledWith('hello world');
    }); 
});
