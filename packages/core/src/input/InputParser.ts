// ─────────────────────────────────────────────────────
// @termuijs/core — Input Parser
// ─────────────────────────────────────────────────────

import type { KeyEvent, MouseEvent } from '../events/types.js';
import { createKeyEvent } from '../events/types.js';
import { ESCAPE_SEQUENCES, CTRL_KEYS, SPECIAL_KEYS } from './KeyMap.js';
import { parseMouseEvent, isMouseSequence } from './MouseParser.js';
import { EventEmitter } from '../events/EventEmitter.js';

interface InputEvents {
    key: KeyEvent;
    mouse: MouseEvent;
    paste: string;
}

/**
 * Reads raw stdin bytes and parses them into typed KeyEvent / MouseEvent objects.
 * Handles escape sequences, multi-byte keys, ctrl+key, and SGR mouse events.
 */
export class InputParser {
    private _events = new EventEmitter<InputEvents>();
    private _stdin: NodeJS.ReadStream;
    private _handler: ((data: Buffer) => void) | null = null;
    private _escapeTimeout: ReturnType<typeof setTimeout> | null = null;
    private _escapeBuffer = '';
    private _isPasting = false;
    private _pasteBuffer = '';
    constructor(stdin: NodeJS.ReadStream) {
        this._stdin = stdin;
    }

    /** Subscribe to key events */
    onKey(handler: (event: KeyEvent) => void): () => void {
        return this._events.on('key', handler);
    }

    /** Subscribe to mouse events */
    onMouse(handler: (event: MouseEvent) => void): () => void {
        return this._events.on('mouse', handler);
    }

    onPaste(handler: (text: string) => void): () => void {
    return this._events.on('paste', handler);
    }
    /** Start listening for input */
    start(): void {
        if (this._handler) return;

        this._handler = (data: Buffer) => {
            this._processInput(data);
        };

        this._stdin.on('data', this._handler);
    }

    /** Stop listening for input */
    stop(): void {
        if (this._handler) {
            this._stdin.off('data', this._handler);
            this._handler = null;
        }
        if (this._escapeTimeout) {
            clearTimeout(this._escapeTimeout);
            this._escapeTimeout = null;
        }
        this._escapeBuffer = '';
    }

    /**
     * Process a chunk of raw input bytes.
     */
    private _processInput(data: Buffer): void {
        const str = data.toString('utf8');
        const PASTE_START = '\x1b[200~';
        const PASTE_END = '\x1b[201~';

        if (str.includes(PASTE_START) && str.includes(PASTE_END)) {
            const pastedText = str
                .replace(PASTE_START, '')
                .replace(PASTE_END, '');

            this._events.emit('paste', pastedText);
            return;
        }
        // If we're collecting an escape sequence
        if (this._escapeBuffer) {
            this._escapeBuffer += str;
            if (this._escapeTimeout) {
                clearTimeout(this._escapeTimeout);
                this._escapeTimeout = null;
            }
            this._tryParseEscape(data);
            return;
        }

        // Check if this starts an escape sequence
        if (str.startsWith('\x1b') && str.length === 1) {
            // Lone ESC — wait a bit to see if more bytes follow
            this._escapeBuffer = str;
            this._escapeTimeout = setTimeout(() => {
                // Timeout — it was a standalone Escape key
                this._events.emit('key', createKeyEvent({
                    key: 'escape',
                    raw: Buffer.from(this._escapeBuffer),
                    ctrl: false,
                    alt: false,
                    shift: false,
                }));
                this._escapeBuffer = '';
                this._escapeTimeout = null;
            }, 50); // 50ms debounce for escape sequences
            return;
        }

        if (str.startsWith('\x1b')) {
            this._escapeBuffer = str;
            this._tryParseEscape(data);
            return;
        }

        // Process each byte for non-escape input
        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            const code = str.charCodeAt(i);
            const raw = Buffer.from(ch, 'utf8');

            // Ctrl+key (0x01-0x1A, excluding tab/enter/backspace)
            if (code >= 0x01 && code <= 0x1A) {
                const keyName = CTRL_KEYS[code];
                const isCtrl = code !== 0x09 && code !== 0x0D && code !== 0x0A;
                this._events.emit('key', createKeyEvent({
                    key: keyName || String.fromCharCode(code + 96),
                    raw,
                    ctrl: isCtrl,
                    alt: false,
                    shift: false,
                }));
                continue;
            }

            // Special keys
            if (code in SPECIAL_KEYS) {
                this._events.emit('key', createKeyEvent({
                    key: SPECIAL_KEYS[code],
                    raw,
                    ctrl: false,
                    alt: false,
                    shift: false,
                }));
                continue;
            }

            // Regular printable character
            if (code >= 0x20) {
                this._events.emit('key', createKeyEvent({
                    key: ch,
                    raw,
                    ctrl: false,
                    alt: false,
                    shift: ch !== ch.toLowerCase() && ch === ch.toUpperCase(),
                }));
            }
        }
    }

    /**
     * Try to parse buffered escape sequence.
     */
    private _tryParseEscape(rawData: Buffer): void {
        const seq = this._escapeBuffer;

        // Check for mouse event first
        if (isMouseSequence(seq)) {
            const mouseEvt = parseMouseEvent(seq);
            if (mouseEvt) {
                this._events.emit('mouse', mouseEvt);
                this._escapeBuffer = '';
                return;
            }
            // Might be incomplete mouse sequence — wait for more data
            if (seq.length < 20) { // safety cap
                if (this._escapeTimeout) {
                    clearTimeout(this._escapeTimeout);
                    this._escapeTimeout = null;
                }
                this._escapeTimeout = setTimeout(() => {
                    this._escapeBuffer = '';
                    this._escapeTimeout = null;
                }, 100);
                return;
            }
        }

        // Check known escape sequences
        if (seq in ESCAPE_SEQUENCES) {
            const keyName = ESCAPE_SEQUENCES[seq];
            const isShift = keyName.startsWith('shift+');
            const isCtrl = keyName.startsWith('ctrl+');
            const isAlt = keyName.startsWith('alt+');
            const cleanKey = keyName.replace(/^(shift|ctrl|alt)\+/, '');

            this._events.emit('key', createKeyEvent({
                key: cleanKey,
                raw: rawData,
                ctrl: isCtrl,
                alt: isAlt,
                shift: isShift,
            }));
            this._escapeBuffer = '';
            return;
        }

        // Alt+key: ESC followed by a regular character
        if (seq.length === 2 && seq[0] === '\x1b') {
            const ch = seq[1];
            this._events.emit('key', createKeyEvent({
                key: ch,
                raw: rawData,
                ctrl: false,
                alt: true,
                shift: ch !== ch.toLowerCase() && ch === ch.toUpperCase(),
            }));
            this._escapeBuffer = '';
            return;
        }

        // If the sequence is getting too long, give up
        if (seq.length > 20) {
            this._escapeBuffer = '';
            return;
        }

        // Wait for more bytes (might be an incomplete sequence)
        if (this._escapeTimeout) {
            clearTimeout(this._escapeTimeout);
            this._escapeTimeout = null;
        }
        this._escapeTimeout = setTimeout(() => {
            // Timeout — emit as unknown escape and clear
            this._escapeBuffer = '';
            this._escapeTimeout = null;
        }, 100);
    }
}
