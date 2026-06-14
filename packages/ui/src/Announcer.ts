// Announcer — screen reader announcer live region
import { Widget } from '@termuijs/widgets';
import { type Screen, mergeStyles, defaultStyle, styleToCellAttrs, truncate } from '@termuijs/core';

export type Politeness = 'polite' | 'assertive';

export interface AnnouncerOptions {
    /** Max messages kept in the visible log. Default 1. */
    history?: number;
}

export class Announcer extends Widget {
    private _history: number;
    private _log: string[] = [];
    private _queue: { text: string; politeness: Politeness }[] = [];

    constructor(options: AnnouncerOptions = {}) {
        super(mergeStyles(defaultStyle(), {}));
        const history = options.history ?? 1;
        if (!Number.isInteger(history) || history < 1) {
            throw new RangeError('AnnouncerOptions.history must be a positive integer');
        }
        this._history = history;
    }

    /** Queue a message. Assertive messages replace any pending polite ones. */
    announce(text: string, politeness: Politeness = 'polite'): void {
        if (politeness === 'assertive') {
            this._queue = this._queue.filter(msg => msg.politeness !== 'polite');
        }
        this._queue.push({ text, politeness });
        this.markDirty();
    }

    /** The current visible announcement text (most recent). */
    get current(): string {
        if (this._queue.length > 0) {
            return this._queue[this._queue.length - 1].text;
        }
        return this._log[this._log.length - 1] ?? '';
    }

    /** Clear the live region. */
    clear(): void {
        this._queue = [];
        this._log = [];
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        // Flush queue to log
        if (this._queue.length > 0) {
            for (const item of this._queue) {
                this._log.push(item.text);
            }
            this._queue = [];
        }

        // Limit log to history size
        if (this._log.length > this._history) {
            this._log = this._log.slice(-this._history);
        }

        const visible = this._log.slice(-height);
        const attrs = styleToCellAttrs(this.style);

        for (let i = 0; i < visible.length; i++) {
            const msg = visible[i];
            // Truncate render output to the display width (handles multi-byte/emoji)
            const text = truncate(msg, width);
            screen.writeString(x, y + i, text, attrs);
        }
    }
}

/** Shared singleton announcer for app-wide use. */
export const announcer = new Announcer();
