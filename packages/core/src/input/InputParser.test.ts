// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for InputParser
// ─────────────────────────────────────────────────────

import { Buffer } from 'node:buffer';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { InputParser } from './InputParser.js';
import { createMockStdin, sendKey as originalSendKey } from '../../../../tests/helpers/mock-stdin.js';

function sendKey(stdin: any, key: any) {
    originalSendKey(stdin, key);
    vi.advanceTimersByTime(10);
}

function createParser() {
    const stdin = createMockStdin();
    const parser = new InputParser(stdin);
    const handler = vi.fn();
    parser.onKey(handler);
    parser.start();
    return { stdin, parser, handler };
}

describe('InputParser', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

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

    it('does not emit Alt+[ for incomplete CSI prefix', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, '\x1b[');
        expect(handler).not.toHaveBeenCalled();
    });

    it('parses split Arrow Up escape sequence arriving in chunks', () => {
        const { stdin, handler } = createParser();
        sendKey(stdin, Buffer.from([0x1b]));
        sendKey(stdin, '[');
        sendKey(stdin, 'A');

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'up' }));
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

    it('parses split multibyte emoji sequences arriving in chunks', () => {
        const { stdin, handler } = createParser();

        // Wave emoji with medium skin tone: 👋🏽 (\u{1F44B}\u{1F3FD})
        // Encoded in UTF-8 as: [0xf0, 0x9f, 0x91, 0x8b, 0xf0, 0x9f, 0x8f, 0xbd]
        const chunk1 = Buffer.from([0xf0, 0x9f, 0x91, 0x8b]);
        const chunk2 = Buffer.from([0xf0, 0x9f, 0x8f, 0xbd]);

        originalSendKey(stdin, chunk1);
        // Should not emit yet as it is incomplete
        expect(handler).not.toHaveBeenCalled();

        originalSendKey(stdin, chunk2);
        // Now it is complete
        vi.advanceTimersByTime(10);
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: '👋🏽' }));
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

    it('handles multi-chunk paste spanning multiple data chunks', () => {
        const stdin = createMockStdin();
        const parser = new InputParser(stdin);

        const pasteHandler = vi.fn();

        parser.onPaste(pasteHandler);
        parser.start();

        // First chunk: paste-start marker + partial content
        stdin.emit('data', Buffer.from('\x1b[200~hello ', 'utf8'));
        expect(pasteHandler).not.toHaveBeenCalled();

        // Second chunk: rest of content + paste-end marker
        stdin.emit('data', Buffer.from('world\x1b[201~', 'utf8'));

        expect(pasteHandler).toHaveBeenCalledWith('hello world');
    });

    it('handles paste with content split across three chunks', () => {
        const stdin = createMockStdin();
        const parser = new InputParser(stdin);

        const pasteHandler = vi.fn();

        parser.onPaste(pasteHandler);
        parser.start();

        stdin.emit('data', Buffer.from('\x1b[200~abc', 'utf8'));
        stdin.emit('data', Buffer.from('def', 'utf8'));
        stdin.emit('data', Buffer.from('ghi\x1b[201~', 'utf8'));

        expect(pasteHandler).toHaveBeenCalledWith('abcdefghi');
    });

    it('emits paste event when both markers are in a single chunk', () => {
        const stdin = createMockStdin();
        const parser = new InputParser(stdin);

        const pasteHandler = vi.fn();

        parser.onPaste(pasteHandler);
        parser.start();

        stdin.emit('data', Buffer.from('before\x1b[200~content\x1b[201~after', 'utf8'));

        expect(pasteHandler).toHaveBeenCalledWith('content');
    });

    it('recovers from partial paste via timeout', () => {
        vi.useFakeTimers();
        const stdin = createMockStdin();
        const parser = new InputParser(stdin);

        const pasteHandler = vi.fn();

        parser.onPaste(pasteHandler);
        parser.start();

        // Start paste but never end it
        stdin.emit('data', Buffer.from('\x1b[200~incomplete', 'utf8'));
        expect(pasteHandler).not.toHaveBeenCalled();

        // Advance time past the paste timeout
        vi.advanceTimersByTime(600);

        // Handler should not have been called (paste was aborted)
        expect(pasteHandler).not.toHaveBeenCalled();

        vi.useRealTimers();
    });

    describe('FSM escape sequence handling', () => {
        it('emits standalone Escape key after 500ms timeout', () => {
            const { stdin, handler } = createParser();
            // Lone ESC byte
            originalSendKey(stdin, Buffer.from([0x1b]));
            expect(handler).not.toHaveBeenCalled();
            // Advance past the 500ms timeout
            vi.advanceTimersByTime(550);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'escape' }));
        });

        it('escapes arriving in delayed chunks are not split into phantom keys', () => {
            const { stdin, handler } = createParser();
            // ESC arrives alone
            originalSendKey(stdin, Buffer.from([0x1b]));
            // Before timeout, rest of sequence arrives
            originalSendKey(stdin, Buffer.from('[A', 'utf8'));
            // Process the combined buffer
            vi.advanceTimersByTime(10);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'up' }));
        });

        it('does not emit phantom keys for escape sequences arriving in chunks under render load', () => {
            const { stdin, handler } = createParser();
            // Simulate ESC arriving alone (as if it was the start of an escape sequence)
            originalSendKey(stdin, Buffer.from([0x1b]));
            // Advance time past 500ms timeout - should NOT emit yet if buffer was appended
            // But in this test, no continuation arrives, so after timeout Escape fires
            vi.advanceTimersByTime(550);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(expect.objectContaining({ key: 'escape' }));
        });

        it('handles bracketed paste start without phantom Escape', () => {
            const { stdin, parser, handler } = createParser();
            const pasteHandler = vi.fn();
            parser.onPaste(pasteHandler);

            // ESC arrives alone first
            originalSendKey(stdin, Buffer.from([0x1b]));
            // Then the rest of bracketed paste start in a second chunk
            originalSendKey(stdin, Buffer.from('[200~hello world\x1b[201~', 'utf8'));
            vi.advanceTimersByTime(10);

            // Should not emit Escape key
            expect(handler).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'escape' }));
            // Should emit paste event
            expect(pasteHandler).toHaveBeenCalledWith('hello world');
        });
    });

    describe('configurable size limits', () => {
        it('limits escape sequence length with maxEscapeSequenceLength option', () => {
            const stdin = createMockStdin();
            const parser = new InputParser(stdin, { maxEscapeSequenceLength: 5 });
            const handler = vi.fn();
            parser.onKey(handler);
            parser.start();
            // Send a long escape sequence — exceeds max of 5
            sendKey(stdin, '\x1b[1;2;3;4;5;6;7;8;9;0A');
            // Should not emit any key (sequence discarded)
            expect(handler).not.toHaveBeenCalled();
        });

        it('limits paste buffer size with maxPasteBufferSize option', () => {
            const stdin = createMockStdin();
            const parser = new InputParser(stdin, { maxPasteBufferSize: 10 });
            const pasteHandler = vi.fn();
            parser.onPaste(pasteHandler);
            parser.start();
            // Paste content larger than 10 bytes
            stdin.emit('data', Buffer.from('\x1b[200~hello world, this is a long paste\x1b[201~', 'utf8'));
            // Content should be truncated to last 10 bytes
            expect(pasteHandler).toHaveBeenCalledWith(expect.stringMatching(/.{10}/));
            expect(pasteHandler).toHaveBeenCalledTimes(1);
        });

        it('discards escape buffer when it exceeds maxEscapeSequenceLength', () => {
            const stdin = createMockStdin();
            const parser = new InputParser(stdin, { maxEscapeSequenceLength: 4 });
            const handler = vi.fn();
            parser.onKey(handler);
            parser.start();
            // Send a lone ESC, then enough bytes to exceed the limit (4)
            stdin.emit('data', Buffer.from([0x1b]));
            stdin.emit('data', Buffer.from('ABCD', 'utf8'));
            vi.advanceTimersByTime(10);
            // ESC + ABCD = 5 bytes > 4 limit — buffer was discarded
            expect(handler).not.toHaveBeenCalled();
        });

        it('limits grapheme buffer size with maxGraphemeBufferSize option', () => {
            const stdin = createMockStdin();
            const parser = new InputParser(stdin, { maxGraphemeBufferSize: 5 });
            const handler = vi.fn();
            parser.onKey(handler);
            parser.start();
            // Send many characters at once (exceeds grapheme buffer limit of 5)
            stdin.emit('data', Buffer.from('abcdefghijklmnop', 'utf8'));
            vi.advanceTimersByTime(20);
            // Buffer keeps only last 5 bytes → 'klmno' → 5 grapheme events
            expect(handler).toHaveBeenCalledTimes(5);
        });

        it('limits key events per chunk with maxKeyEventsPerChunk option', () => {
            const stdin = createMockStdin();
            const parser = new InputParser(stdin, { maxKeyEventsPerChunk: 3 });
            const handler = vi.fn();
            parser.onKey(handler);
            parser.start();
            // Send many characters at once
            stdin.emit('data', Buffer.from('abcdefghij', 'utf8'));
            vi.advanceTimersByTime(20);
            // Should only emit up to 3 events
            expect(handler).toHaveBeenCalledTimes(3);
        });

        it('default options preserve backward compatibility', () => {
            const stdin = createMockStdin();
            const parser = new InputParser(stdin);
            const handler = vi.fn();
            parser.onKey(handler);
            parser.start();
            sendKey(stdin, 'hello');
            expect(handler).toHaveBeenCalledTimes(5);
        });

        it('does not drop bytes from a raw chunk larger than maxEscapeSequenceLength', () => {
            // A single data event bigger than the (default 4096) escape-sequence
            // limit must not be truncated before parsing — that limit only bounds
            // escape-sequence buffering, not the whole incoming chunk.
            const stdin = createMockStdin();
            const parser = new InputParser(stdin);
            const pasteHandler = vi.fn();
            parser.onPaste(pasteHandler);
            parser.start();

            const content = 'x'.repeat(5000); // > DEFAULT_MAX_ESCAPE_SEQUENCE_LENGTH (4096), < paste buffer cap (1MB)
            stdin.emit('data', Buffer.from(`\x1b[200~${content}\x1b[201~`, 'utf8'));

            expect(pasteHandler).toHaveBeenCalledWith(content);
            expect(pasteHandler.mock.calls[0][0]).toHaveLength(5000);
        });
    });
});
