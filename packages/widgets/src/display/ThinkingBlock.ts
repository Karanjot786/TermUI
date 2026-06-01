// ─────────────────────────────────────────────────────
// @termuijs/widgets — ThinkingBlock widget
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type KeyEvent,
    styleToCellAttrs,
    wordWrap,
    caps,
} from '@termuijs/core';

import { timerPoolSubscribe } from '@termuijs/motion';
import { Widget } from '../base/Widget.js';

export interface ThinkingBlockOptions {
    width?: number;
    thinking?: string;
}

export class ThinkingBlock extends Widget {
    private _text: string;
    private _expanded = false;
    private _streaming = false;

    private _dots = '';
    private _timerUnsub?: () => void;

    constructor(
        options: ThinkingBlockOptions = {},
        style: Partial<Style> = {},
    ) {
        super(style);

        this._text = options.thinking ?? '';
        this.focusable = true;
    }

    appendText(chunk: string): void {
        this._text += chunk;
        this.markDirty();
    }

    setStreaming(streaming: boolean): void {
        this._streaming = streaming;
        this.markDirty();
    }

    toggle(): void {
        this._expanded = !this._expanded;
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        if (event.key === 'enter' || event.key === 't') {
            this.toggle();
        }
    }

    mount(): void {
        super.mount();

        if (!caps.motion) return;

        this._timerUnsub = timerPoolSubscribe(300, () => {
            this._dots =
                this._dots.length >= 3
                    ? ''
                    : this._dots + '.';

            this.markDirty();
        });
    }

    unmount(): void {
        this._timerUnsub?.();
        this._timerUnsub = undefined;
        super.unmount();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const attrs = styleToCellAttrs(this._style);

        if (!this._expanded) {
            const text = `[thinking${this._streaming ? this._dots : ''}]`;
            screen.writeString(rect.x, rect.y, text, attrs);
            return;
        }

        const boxWidth = Math.max(4, rect.width);

        const tl = caps.unicode ? '┌' : '+';
        const tr = caps.unicode ? '┐' : '+';
        const bl = caps.unicode ? '└' : '+';
        const br = caps.unicode ? '┘' : '+';
        const h = caps.unicode ? '─' : '-';
        const v = caps.unicode ? '│' : '|';

        screen.writeString(
            rect.x,
            rect.y,
            tl + h.repeat(Math.max(0, boxWidth - 2)) + tr,
            attrs,
        );

        const wrapped = wordWrap(
            this._text +
                (this._streaming ? `\n\nthinking${this._dots}` : ''),
            Math.max(1, boxWidth - 4),
        );

        const lines = wrapped.split('\n');

        const availableHeight = Math.max(0, rect.height - 2);
        const limit = Math.min(lines.length, availableHeight);

        for (let i = 0; i < limit; i++) {
            const line = lines[i];

            screen.writeString(
                rect.x,
                rect.y + i + 1,
                v,
                attrs,
            );

            screen.writeString(
                rect.x + 2,
                rect.y + i + 1,
                line,
                attrs,
            );

            screen.writeString(
                rect.x + boxWidth - 1,
                rect.y + i + 1,
                v,
                attrs,
            );
        }

        screen.writeString(
            rect.x,
            rect.y + limit + 1,
            bl + h.repeat(Math.max(0, boxWidth - 2)) + br,
            attrs,
        );
    }
}
