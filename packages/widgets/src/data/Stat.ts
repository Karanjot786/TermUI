import { type Screen, type Style, type Color, styleToCellAttrs, stringWidth } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface StatOptions {
    delta?: number;
    valueColor?: Color;
}

export class Stat extends Widget {
    private _label: string;
    private _value: string;
    private _delta: number | undefined;
    private _valueColor: Color;

    constructor(label: string, value: string, style: Partial<Style> = {}, opts: StatOptions = {}) {
        super(style);
        this._label = label;
        this._value = value;
        this._delta = opts.delta;
        this._valueColor = opts.valueColor ?? { type: 'named', name: 'white' };
    }

    setValue(value: string): void {
        this._value = value;
        this.markDirty();
    }

    setDelta(delta: number | undefined): void {
        this._delta = delta;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Row 0: label (bold)
        screen.writeString(x, y, this._label, { ...attrs, bold: true });

        if (height < 2) return;

        // Row 1: value
        screen.writeString(x, y + 1, this._value, { ...attrs, fg: this._valueColor });

        // Optional delta arrow
        if (this._delta !== undefined) {
            const valueWidth = stringWidth(this._value);
            const arrowX = x + valueWidth + 1;

            if (arrowX >= x + width) return;

            if (this._delta > 0) {
                screen.setCell(arrowX, y + 1, { char: '\u2191', fg: { type: 'named', name: 'green' } });
            } else if (this._delta < 0) {
                screen.setCell(arrowX, y + 1, { char: '\u2193', fg: { type: 'named', name: 'red' } });
            } else {
                screen.setCell(arrowX, y + 1, { char: '\u2192', dim: true });
            }
        }
    }
}
