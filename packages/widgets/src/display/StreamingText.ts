// ─────────────────────────────────────────────────────
// @termuijs/widgets — StreamingText widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs, wordWrap, caps, prefersReducedMotion } from '@termuijs/core';
import { timerPoolSubscribe } from '@termuijs/motion';
import { Widget } from '../base/Widget.js';

export interface StreamingTextOptions {
    /** Full text content */
    text: string;
    /** Cursor character. Default: '▋' */
    cursor?: string;
    /** Characters to reveal per tick (0 = show all immediately). Default: 0 */
    speed?: number;
    /** Cursor blink interval in ms. Default: 530 */
    blinkInterval?: number;
}

const segmenter = new Intl.Segmenter();

/**
 * StreamingText — renders text that "streams in" token by token with a blinking cursor.
 *
 * Useful for displaying AI response streams or typewriter-style text effects.
 *
 * - When `speed === 0`: shows full text immediately, cursor blinks at end.
 * - When `speed > 0`: reveals `speed` chars per `tick()` call until complete.
 * - Cursor blinks every `blinkInterval` ms via the shared timer pool.
 */
export class StreamingText extends Widget {
    private _text: string;
    private _segments: Intl.SegmentData[];
    private _cursor: string;
    private _speed: number;
    private _blinkInterval: number;
    /** Number of characters currently revealed (used when speed > 0) */
    private _revealed: number;
    private _cursorVisible: boolean;
    private _blinkUnsub?: () => void;

    constructor(options: StreamingTextOptions, style: Partial<Style> = {}) {
        super(style);
        this._text = options.text;
        this._segments = Array.from(segmenter.segment(this._text));
        this._cursor = options.cursor ?? (caps.unicode ? '▋' : '_');
        this._speed = options.speed ?? 0;
        this._blinkInterval = options.blinkInterval ?? 530;
        this._revealed = 0;
        this._cursorVisible = true;
    }

    /** Replace text content and reset the revealed counter to 0. */
    setText(text: string): void {
        if (text === this._text) return;
        this._text = text;
        this._segments = Array.from(segmenter.segment(text));
        this._revealed = 0;
        this.markDirty();
    }

    /**
     * Advance `_revealed` by `speed` characters.
     * Call this from an external tick/render loop when `speed > 0`.
     */
    tick(): void {
        if (this._speed <= 0 || this.isComplete()) return;
        const len = this._segments.length;
        this._revealed = Math.min(this._revealed + this._speed, len);
        this.markDirty();
    }

    /** Returns true when all text has been revealed. */
    isComplete(): boolean {
        if (this._speed === 0) return true;
        const len = this._segments.length;
        return this._revealed >= len;
    }

    /** Lifecycle: start the blink timer (only when motion is enabled). */
    mount(): void {
        super.mount();
        if (prefersReducedMotion()) {
            this._cursorVisible = false;  // Don't show cursor in reduced-motion
            return;
        }
        this._blinkUnsub = timerPoolSubscribe(this._blinkInterval, () => {
            this._cursorVisible = !this._cursorVisible;
            this.markDirty();
        });
    }

    /** Lifecycle: stop the blink timer. */
    unmount(): void {
        this._blinkUnsub?.();
        this._blinkUnsub = undefined;
        super.unmount();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Determine how much text to display
        const segments = this._segments;
        const displayText = this._speed > 0
            ? segments.slice(0, this._revealed).map(s => s.segment).join('')
            : this._text;

        // Append cursor if visible
        const fullText = this._cursorVisible
            ? displayText + this._cursor
            : displayText;

        // Word-wrap to fit within content width
        const wrapped = wordWrap(fullText, width);
        const lines = wrapped.split('\n');

        // Render up to rect.height lines
        const limit = Math.min(lines.length, height);
        for (let i = 0; i < limit; i++) {
            const line = lines[i];
            if (line === undefined) continue;
            screen.writeString(x, y + i, line, attrs);
        }
    }
}
