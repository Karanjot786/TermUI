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
    afterEach(() => { vi.restoreAllMocks(); });

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
