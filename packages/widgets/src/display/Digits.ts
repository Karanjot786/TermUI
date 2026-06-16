// ─────────────────────────────────────────────────────
// @termuijs/widgets — Digits widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface DigitsOptions {
    color?: Color;
}

// 3-row × 4-col ASCII art digit map
// Each digit is 4 columns wide, 3 rows tall
const DIGIT_MAP: Record<string, string[]> = {
    '0': ['.--.',  '|  |', "'--'"],
    '1': ['   |', '   |', '   |'],
    '2': ['.--.',  ' --|', "'--'"],
    '3': ['.--.',  ' --|', ' --\''],
    '4': ['|  |', "'--|", '   |'],
    '5': ['.--.',  '|-- ', " --'"],
    '6': ['.--.',  '|-- ', "'--'"],
    '7': ['.--.',  '   |', '   |'],
    '8': ['.--.',  '|--|', "'--'"],
    '9': ['.--.',  "'--|", "   '"],
    ':': ['  ', '* ', '* '],
    '.': ['  ', '  ', '* '],
    '%': ['|/ ', ' / ', '/ |'],
    ' ': ['    ', '    ', '    '],
};

const DIGIT_HEIGHT = 3;
const DIGIT_WIDTH = 4;

/**
 * Digits — renders a numeric string as large 3-row ASCII art.
 * Similar to a 7-segment display. 
 *
 * Example:
 *   new Digits({ value: '42', color: 'cyan', width: 20, height: 3 })
 */
export class Digits extends Widget {
    private _value: string;
    private _color: Color;

    constructor(style: Partial<Style> = {}, opts: DigitsOptions = {}) {
        super({ height: DIGIT_HEIGHT, ...style });
        this._value = String((style as Record<string, unknown>).value ?? '0');
        this._color = opts.color ?? { type: 'named', name: 'white' };
    }

    setValue(value: string): void {
        if (this._value === value) return;
        this._value = value;
        this.markDirty();
    }

    getValue(): string {
        return this._value;
    }

    setColor(color: Color): void {
        if (this._color === color) return;
        this._color = color;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const fg = this._color;

        let curX = x;

        for (const ch of this._value) {
            const glyph = DIGIT_MAP[ch] ?? DIGIT_MAP[' ']!;
            const glyphWidth = DIGIT_WIDTH;

            if (curX + glyphWidth > x + width) break;

            for (let row = 0; row < DIGIT_HEIGHT && row < height; row++) {
                const rowStr = glyph[row] ?? '';
                for (let col = 0; col < rowStr.length; col++) {
                    const char = rowStr[col];
                    if (char !== ' ') {
                        screen.setCell(curX + col, y + row, { char, ...attrs, fg });
                    }
                }
            }

            // 1 column gap between digits
            curX += glyphWidth + 1;
        }
    }
}
