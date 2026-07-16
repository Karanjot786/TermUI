// ─────────────────────────────────────────────────────
// @termuijs/core — Input Parser
// ─────────────────────────────────────────────────────

import { Buffer } from 'node:buffer';
import { StringDecoder } from 'node:string_decoder';
import type { KeyEvent, MouseEvent } from '../events/types.js';
import { createKeyEvent } from '../events/types.js';
import { ESCAPE_SEQUENCES, CTRL_KEYS, SPECIAL_KEYS } from './KeyMap.js';
import { parseMouseEvent, isMouseSequence } from './MouseParser.js';
import { EventEmitter } from '../events/EventEmitter.js';
import { splitGraphemes } from './grapheme.js';

const ESCAPE_TIMEOUT_MS = 500;
const DEFAULT_MAX_ESCAPE_SEQUENCE_LENGTH = 4096;
const DEFAULT_MAX_PASTE_BUFFER_SIZE = 1024 * 1024; // 1 MB
const DEFAULT_MAX_GRAPHENE_BUFFER_SIZE = 4096;
const DEFAULT_MAX_KEY_EVENTS_PER_CHUNK = 1000;

export interface CursorPosition {
    row: number;
    col: number;
}

export interface InputParserOptions {
    /**
     * Maximum byte length for an escape sequence buffer.
     * Sequences exceeding this are discarded to prevent memory exhaustion.
     * Default: 4096
     */
    maxEscapeSequenceLength?: number;
    /**
     * Maximum byte length for the paste buffer.
     * Paste content exceeding this is truncated.
     * Default: 1,048,576 (1 MB)
     */
    maxPasteBufferSize?: number;
    /**
     * Maximum byte length for the grapheme buffer.
     * Grapheme content exceeding this is discarded.
     * Default: 4096
     */
    maxGraphemeBufferSize?: number;
    /**
     * Maximum number of key events to emit from a single _processInput call.
     * Prevents event loop starvation from a flood of input data.
     * Default: 1000
     */
    maxKeyEventsPerChunk?: number;
}

interface InputEvents {
    key: KeyEvent;
    mouse: MouseEvent;
    focuschange: boolean;
    paste: string;
}

/**
 * Reads raw stdin bytes and parses them into typed KeyEvent / MouseEvent objects.
 * Handles escape sequences, multi-byte keys, ctrl+key, and SGR mouse events.
 */
export class InputParser {
    private _events = new EventEmitter<InputEvents>();
    private _stdin: NodeJS.ReadStream;
    private _decoder = new StringDecoder('utf8');
    private _graphemeBuffer = '';
    private _graphemeTimeout: ReturnType<typeof setTimeout> | null = null;
    private _handler: ((data: Buffer) => void) | null = null;
    private _escapeTimeout: ReturnType<typeof setTimeout> | null = null;
    private _escapeBuffer: Buffer = Buffer.alloc(0);
    private _isPasting = false;
    private _pasteBuffer = '';
    private _pasteTimeout: ReturnType<typeof setTimeout> | null = null;
    private _cursorRequests: Array<{
        resolve: (position: CursorPosition) => void;
        reject: (error: Error) => void;
        timeout: ReturnType<typeof setTimeout>;
    }> = [];
    private _maxEscapeSequenceLength: number;
    private _maxPasteBufferSize: number;
    private _maxGraphemeBufferSize: number;
    private _maxKeyEventsPerChunk: number;

    constructor(stdin: NodeJS.ReadStream, options: InputParserOptions = {}) {
        this._stdin = stdin;
        this._maxEscapeSequenceLength = options.maxEscapeSequenceLength ?? DEFAULT_MAX_ESCAPE_SEQUENCE_LENGTH;
        this._maxPasteBufferSize = options.maxPasteBufferSize ?? DEFAULT_MAX_PASTE_BUFFER_SIZE;
        this._maxGraphemeBufferSize = options.maxGraphemeBufferSize ?? DEFAULT_MAX_GRAPHENE_BUFFER_SIZE;
        this._maxKeyEventsPerChunk = options.maxKeyEventsPerChunk ?? DEFAULT_MAX_KEY_EVENTS_PER_CHUNK;
    }

    /** Subscribe to key events */
    onKey(handler: (event: KeyEvent) => void): () => void {
        return this._events.on('key', handler);
    }

    /** Subscribe to mouse events */
    onMouse(handler: (event: MouseEvent) => void): () => void {
        return this._events.on('mouse', handler);
    }

    /** Subscribe to terminal focus-in (true) / focus-out (false) reports. */
    onFocusChange(handler: (focused: boolean) => void): () => void {
        return this._events.on('focuschange', handler);
    }

    onPaste(handler: (text: string) => void): () => void {
        return this._events.on('paste', handler);
    }

    requestCursorPosition(timeoutMs = 200): Promise<CursorPosition> {
        return new Promise<CursorPosition>((resolve, reject) => {
            const timeout = setTimeout(() => {
                const idx = this._cursorRequests.findIndex((item) => item.reject === reject);
                if (idx !== -1) {
                    this._cursorRequests.splice(idx, 1);
                }
                reject(new Error('Cursor position request timed out'));
            }, timeoutMs);

            this._cursorRequests.push({ resolve, reject, timeout });
        });
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
        if (this._graphemeTimeout) {
            clearTimeout(this._graphemeTimeout);
            this._graphemeTimeout = null;
        }
        if (this._pasteTimeout) {
            clearTimeout(this._pasteTimeout);
            this._pasteTimeout = null;
        }
        this._escapeBuffer = Buffer.alloc(0);
        this._graphemeBuffer = '';
        this._isPasting = false;
        this._pasteBuffer = '';
        this._decoder.end();
        for (const req of this._cursorRequests) {
            clearTimeout(req.timeout);
            req.reject(new Error('InputParser stopped'));
        }
        this._cursorRequests = [];
    }

    /**
     * Process a chunk of raw input bytes.
     */
    private _processInput(data: Buffer): void {
        const PASTE_START = '\x1b[200~';
        const PASTE_END = '\x1b[201~';

        if (this._isPasting) {
            const str = this._decoder.write(data);
            const endIdx = str.indexOf(PASTE_END);
            if (endIdx !== -1) {
                const chunk = str.substring(0, endIdx);
                const newLen = this._pasteBuffer.length + chunk.length;
                if (newLen > this._maxPasteBufferSize) {
                    const excess = newLen - this._maxPasteBufferSize;
                    this._pasteBuffer = this._pasteBuffer.slice(excess) + chunk;
                    this._pasteBuffer = this._pasteBuffer.slice(-this._maxPasteBufferSize);
                } else {
                    this._pasteBuffer += chunk;
                }
                const pastedText = this._pasteBuffer;
                this._isPasting = false;
                this._pasteBuffer = '';
                this._clearPasteTimeout();
                this._events.emit('paste', pastedText);

                const remaining = str.substring(endIdx + PASTE_END.length);
                if (remaining.length > 0) {
                    this._processInput(Buffer.from(remaining, 'utf8'));
                }
            } else {
                const newLen = this._pasteBuffer.length + str.length;
                if (newLen > this._maxPasteBufferSize) {
                    const excess = newLen - this._maxPasteBufferSize;
                    this._pasteBuffer = this._pasteBuffer.slice(excess) + str;
                    if (this._pasteBuffer.length > this._maxPasteBufferSize) {
                        this._pasteBuffer = this._pasteBuffer.slice(-this._maxPasteBufferSize);
                    }
                } else {
                    this._pasteBuffer += str;
                }
                this._startPasteTimeout();
            }
            return;
        }

        // If we are currently collecting an escape sequence, continue collecting it
        if (this._escapeBuffer.length > 0) {
            const newBuf = Buffer.concat([this._escapeBuffer, data]);
            this._escapeBuffer = newBuf.length > this._maxEscapeSequenceLength
                ? newBuf.slice(0, this._maxEscapeSequenceLength)
                : newBuf;
            if (this._escapeTimeout) {
                clearTimeout(this._escapeTimeout);
                this._escapeTimeout = null;
            }
            this._tryParseEscape();
            // If the sequence is still incomplete, restart the timeout
            // so fragmented TCP chunks won't trigger a false standalone ESC.
            if (this._escapeBuffer.length > 0) {
                this._startEscapeTimeout();
            }
            return;
        }

        const str = data.toString('utf8');
        
        const startIdx = str.indexOf(PASTE_START);
        if (startIdx !== -1) {
            if (startIdx > 0) {
                const before = str.substring(0, startIdx);
                this._processInput(Buffer.from(before, 'utf8'));
            }

            const afterStart = str.substring(startIdx + PASTE_START.length);
            const endIdx = afterStart.indexOf(PASTE_END);
            
            if (endIdx !== -1) {
                this._events.emit('paste', afterStart.substring(0, endIdx));
                const remaining = afterStart.substring(endIdx + PASTE_END.length);
                if (remaining.length > 0) {
                    this._processInput(Buffer.from(remaining, 'utf8'));
                }
            } else {
                this._isPasting = true;
                this._pasteBuffer = afterStart.length > this._maxPasteBufferSize
                    ? afterStart.slice(-this._maxPasteBufferSize)
                    : afterStart;
                this._startPasteTimeout();
            }
            return;
        }

        // Check if this starts an escape sequence
        if (str.startsWith('\x1b') && str.length === 1) {
            // Lone ESC — wait for more bytes
            this._escapeBuffer = data;
            this._startEscapeTimeout();
            return;
        }

        if (str.startsWith('\x1b')) {
            this._escapeBuffer = data;
            this._tryParseEscape();
            if (this._escapeBuffer.length > 0) {
                this._startEscapeTimeout();
            }
            return;
        }

        // Decode input and append to grapheme buffer
        const decoded = this._decoder.write(data);
        const newLen = this._graphemeBuffer.length + decoded.length;
        if (newLen > this._maxGraphemeBufferSize) {
            const excess = newLen - this._maxGraphemeBufferSize;
            this._graphemeBuffer = this._graphemeBuffer.slice(excess) + decoded;
            if (this._graphemeBuffer.length > this._maxGraphemeBufferSize) {
                this._graphemeBuffer = this._graphemeBuffer.slice(-this._maxGraphemeBufferSize);
            }
        } else {
            this._graphemeBuffer += decoded;
        }

        if (this._graphemeTimeout) {
            clearTimeout(this._graphemeTimeout);
            this._graphemeTimeout = null;
        }

        // Process after a short 10ms delay to merge split chunks (like modifiers or ZWJ sequences)
        this._graphemeTimeout = setTimeout(() => {
            this._processGraphemeBuffer();
            this._graphemeTimeout = null;
        }, 10);
    }

    private _processGraphemeBuffer(): void {
        if (!this._graphemeBuffer) return;

        const graphemes = splitGraphemes(this._graphemeBuffer);
        if (graphemes.length === 0) return;

        let processCount = Math.min(graphemes.length, this._maxKeyEventsPerChunk);
        // Check if the last grapheme is potentially incomplete
        const lastGrapheme = graphemes[processCount - 1];
        if (processCount > 0 && this._isPossiblyIncompleteGrapheme(lastGrapheme)) {
            processCount = processCount - 1;
        }

        for (let i = 0; i < processCount; i++) {
            const ch = graphemes[i];
            const code = ch.codePointAt(0)!;
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

        // Update the remaining buffer
        this._graphemeBuffer = graphemes.slice(processCount).join('');
    }

    private _isPossiblyIncompleteGrapheme(ch: string): boolean {
        if (!ch) return false;
        // ZWJ sequence continuation check
        if (ch.endsWith('\u200D')) return true;
        // Surrogate pair incomplete check (last char is high surrogate)
        const lastCharCode = ch.charCodeAt(ch.length - 1);
        if (lastCharCode >= 0xD800 && lastCharCode <= 0xDBFF) return true;
        
        // Regional Indicator Symbols (flags: U+1F1E6 to U+1F1FF)
        // Check if there's an odd number of regional indicator symbols in this grapheme
        const codePoints = Array.from(ch);
        const lastCpVal = codePoints[codePoints.length - 1].codePointAt(0)!;
        if (lastCpVal >= 0x1F1E6 && lastCpVal <= 0x1F1FF) {
            let riCount = 0;
            for (let i = codePoints.length - 1; i >= 0; i--) {
                const cp = codePoints[i].codePointAt(0)!;
                if (cp >= 0x1F1E6 && cp <= 0x1F1FF) {
                    riCount++;
                } else {
                    break;
                }
            }
            if (riCount % 2 !== 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Start or restart the escape sequence timeout.
     * Fires when no additional bytes arrive within the window,
     * treating the buffered bytes as a standalone Escape key.
     */
    private _startEscapeTimeout(): void {
        if (this._escapeTimeout) {
            clearTimeout(this._escapeTimeout);
        }
        this._escapeTimeout = setTimeout(() => {
            const remained = this._escapeBuffer;
            this._escapeBuffer = Buffer.alloc(0);
            this._escapeTimeout = null;
            this._events.emit('key', createKeyEvent({
                key: 'escape',
                raw: remained,
                ctrl: false,
                alt: false,
                shift: false,
            }));
        }, ESCAPE_TIMEOUT_MS);
    }

    /**
     * Start or restart the paste inactivity timeout.
     * If no additional paste data arrives within the timeout,
     * the paste state is aborted to prevent stale state.
     */
    private _startPasteTimeout(): void {
        this._clearPasteTimeout();
        this._pasteTimeout = setTimeout(() => {
            this._isPasting = false;
            this._pasteBuffer = '';
            this._pasteTimeout = null;
        }, 500);
    }

    private _clearPasteTimeout(): void {
        if (this._pasteTimeout) {
            clearTimeout(this._pasteTimeout);
            this._pasteTimeout = null;
        }
    }

    /**
     * Try to parse buffered escape sequence.
     */
    private _tryParseEscape(): void {
        const seq = this._escapeBuffer.toString('utf8');

        const PASTE_START = '\x1b[200~';
        const PASTE_END = '\x1b[201~';
        const pasteStartIdx = seq.indexOf(PASTE_START);
        if (pasteStartIdx !== -1) {
            this._escapeBuffer = Buffer.alloc(0);
            if (pasteStartIdx > 0) {
                queueMicrotask(() => this._processInput(Buffer.from(seq.substring(0, pasteStartIdx), 'utf8')));
            }
            const after = seq.substring(pasteStartIdx + PASTE_START.length);
            const endIdx = after.indexOf(PASTE_END);
            if (endIdx !== -1) {
                this._events.emit('paste', after.substring(0, endIdx));
                const remaining = after.substring(endIdx + PASTE_END.length);
                if (remaining.length > 0) {
                    this._processInput(Buffer.from(remaining, 'utf8'));
                }
            } else {
                queueMicrotask(() => this._processInput(Buffer.from(after, 'utf8')));
            }
            return;
        }

        // Check for mouse event first
        if (isMouseSequence(seq)) {
            const mouseEvt = parseMouseEvent(seq);
            if (mouseEvt) {
                this._events.emit('mouse', mouseEvt);
                this._escapeBuffer = Buffer.alloc(0);
                return;
            }
            // Might be incomplete mouse sequence — wait for more data (no timeout, FSM handles via _escapeBuffer)
            if (seq.length < 20) {
                return;
            }
        }

        // Cursor position report
        const cursorMatch = seq.match(/^\x1b\[(\d+);(\d+)R$/);
        if (cursorMatch) {
            const row = parseInt(cursorMatch[1], 10);
            const col = parseInt(cursorMatch[2], 10);
            const position = { row, col };

            for (const request of this._cursorRequests) {
                clearTimeout(request.timeout);
                request.resolve(position);
            }
            this._cursorRequests = [];
            this._escapeBuffer = Buffer.alloc(0);
            return;
        }

        // Focus tracking sequences
        if (seq === '\x1b[I') {
            this._events.emit('focuschange', true);
            this._escapeBuffer = Buffer.alloc(0);
            return;
        }

        if (seq === '\x1b[O') {
            this._events.emit('focuschange', false);
            this._escapeBuffer = Buffer.alloc(0);
            return;
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
                raw: this._escapeBuffer,
                ctrl: isCtrl,
                alt: isAlt,
                shift: isShift,
            }));
            this._escapeBuffer = Buffer.alloc(0);
            return;
        }

        // Alt+key: ESC followed by a regular character
        if (
            seq.length === 2 &&
            seq[0] === '\x1b' &&
            seq[1] !== '[' &&
            seq[1] !== 'O'
        ) {
            const ch = seq[1];
            this._events.emit('key', createKeyEvent({
                key: ch,
                raw: this._escapeBuffer,
                ctrl: false,
                alt: true,
                shift: ch !== ch.toLowerCase() && ch === ch.toUpperCase(),
            }));
            this._escapeBuffer = Buffer.alloc(0);
            return;
        }

        // If the sequence is at or over the limit, discard it
        if (seq.length >= this._maxEscapeSequenceLength) {
            this._escapeBuffer = Buffer.alloc(0);
            return;
        }

        // Wait for more bytes (might be an incomplete sequence; FSM handles via _escapeBuffer)
        return;
    }
}
