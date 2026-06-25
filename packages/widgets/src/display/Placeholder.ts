// -----------------------------------------------------------------------------
// @termuijs/widgets - Placeholder widget
// -----------------------------------------------------------------------------

import { type Screen, type Style, type Color, caps, stringWidth, styleToCellAttrs } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface PlaceholderOptions {
    /** Fill character. Default: '░' with ASCII fallback '.' */
    fillChar?: string;
    borderColor?: Color;
    labelColor?: Color;
}

/**
 * Placeholder - a labeled stand-in box for prototyping terminal layouts.
 */
export class Placeholder extends Widget {
    private _label: string;
    private _fillChar?: string;
    private _borderColor?: Color;
    private _labelColor?: Color;

    constructor(label: string, style: Partial<Style> = {}, opts: PlaceholderOptions = {}) {
        super(style);
        this._label = label;
        this._fillChar = opts.fillChar;
        this._borderColor = opts.borderColor;
        this._labelColor = opts.labelColor;
    }

    setLabel(label: string): void {
        if (this._label === label) return;
        this._label = label;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const fillAttrs = { ...attrs };
        const borderAttrs = { ...attrs, fg: this._borderColor };
        const labelAttrs = { ...attrs, fg: this._labelColor };

        const fillChar = this._fillChar ?? (caps.unicode ? '\u2591' : '.');
        const tl = caps.unicode ? '\u250c' : '+';
        const tr = caps.unicode ? '\u2510' : '+';
        const bl = caps.unicode ? '\u2514' : '+';
        const br = caps.unicode ? '\u2518' : '+';
        const hz = caps.unicode ? '\u2500' : '-';
        const vt = caps.unicode ? '\u2502' : '|';

        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                screen.setCell(x + col, y + row, { char: fillChar, ...fillAttrs });
            }
        }

        for (let col = 0; col < width; col++) {
            screen.setCell(x + col, y, { char: hz, ...borderAttrs });
            screen.setCell(x + col, y + height - 1, { char: hz, ...borderAttrs });
        }

        for (let row = 0; row < height; row++) {
            screen.setCell(x, y + row, { char: vt, ...borderAttrs });
            screen.setCell(x + width - 1, y + row, { char: vt, ...borderAttrs });
        }

        screen.setCell(x, y, { char: tl, ...borderAttrs });
        screen.setCell(x + width - 1, y, { char: tr, ...borderAttrs });
        screen.setCell(x, y + height - 1, { char: bl, ...borderAttrs });
        screen.setCell(x + width - 1, y + height - 1, { char: br, ...borderAttrs });

        if (width <= 2 || height <= 2 || this._label.length === 0) return;

        const innerWidth = width - 2;
        const visibleLabel = this._label.slice(0, innerWidth);
        const labelWidth = Math.min(stringWidth(visibleLabel), innerWidth);
        const labelX = x + 1 + Math.max(0, Math.floor((innerWidth - labelWidth) / 2));
        const labelY = y + Math.floor(height / 2);

        screen.writeString(labelX, labelY, visibleLabel, labelAttrs);
    }
}
