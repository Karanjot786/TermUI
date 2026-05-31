// @termuijs/widgets — Tooltip widget

import { type Screen, type Style, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface TooltipOptions {
    text: string;
    visible: boolean;
}

/**
 * Tooltip — displays contextual help text.
 *
 * The widget renders within its own assigned rect.
 * The parent is responsible for positioning it via updateRect().
 */
export class Tooltip extends Widget {
    private _text: string;
    private _visible: boolean;

    constructor(options: TooltipOptions, style: Partial<Style> = {}) {
        super(style);

        this._text = options.text;
        this._visible = options.visible;
    }

    protected _renderSelf(screen: Screen): void {
        if (!this._visible) return;

        const { x, y, width, height } = this._rect;

        if (width <= 0 || height <= 0) return;

        const tl = caps.unicode ? '┌' : '+';
        const tr = caps.unicode ? '┐' : '+';
        const bl = caps.unicode ? '└' : '+';
        const br = caps.unicode ? '┘' : '+';
        const hz = caps.unicode ? '─' : '-';
        const vt = caps.unicode ? '│' : '|';

        // Top border
        screen.setCell(x, y, { char: tl });

        for (let c = 1; c < width - 1; c++) {
            screen.setCell(x + c, y, { char: hz });
        }

        if (width > 1) {
            screen.setCell(x + width - 1, y, { char: tr });
        }

        // Content row
        if (height >= 2) {
            screen.setCell(x, y + 1, { char: vt });

            const content = this._text
                .slice(0, Math.max(0, width - 2))
                .padEnd(Math.max(0, width - 2), ' ');

            screen.writeString(x + 1, y + 1, content);

            if (width > 1) {
                screen.setCell(x + width - 1, y + 1, { char: vt });
            }
        }

        // Bottom border
        if (height >= 3) {
            screen.setCell(x, y + height - 1, { char: bl });

            for (let c = 1; c < width - 1; c++) {
                screen.setCell(x + c, y + height - 1, { char: hz });
            }

            if (width > 1) {
                screen.setCell(x + width - 1, y + height - 1, {
                    char: br,
                });
            }
        }
    }

    setText(text: string): void {
        this._text = text;
        this.markDirty();
    }

    getText(): string {
        return this._text;
    }

    setVisible(visible: boolean): void {
        this._visible = visible;
        this.markDirty();
    }

    getVisible(): boolean {
        return this._visible;
    }
}
