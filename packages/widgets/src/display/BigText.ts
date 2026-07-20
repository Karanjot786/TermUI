// ─────────────────────────────────────────────────────
// @termuijs/widgets — BigText widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface BigTextOptions {
    /** Color for the rendered characters */
    color?: Color;
}

// 5×3 ASCII art character map (5 rows × 3 cols per char)
// Each character is represented as an array of 5 strings, each 3 chars wide.
const CHAR_MAP: Record<string, string[]> = {
    'A': [' # ', '# #', '###', '# #', '# #'],
    'B': ['## ', '# #', '## ', '# #', '## '],
    'C': [' ##', '#  ', '#  ', '#  ', ' ##'],
    'D': ['## ', '# #', '# #', '# #', '## '],
    'E': ['###', '#  ', '## ', '#  ', '###'],
    'F': ['###', '#  ', '## ', '#  ', '#  '],
    'G': [' ##', '#  ', '# #', '# #', ' ##'],
    'H': ['# #', '# #', '###', '# #', '# #'],
    'I': ['###', ' # ', ' # ', ' # ', '###'],
    'J': ['###', '  #', '  #', '# #', ' # '],
    'K': ['# #', '## ', '#  ', '## ', '# #'],
    'L': ['#  ', '#  ', '#  ', '#  ', '###'],
    'M': ['# #', '###', '# #', '# #', '# #'],
    'N': ['# #', '## ', '# #', '# #', '# #'],
    'O': [' # ', '# #', '# #', '# #', ' # '],
    'P': ['## ', '# #', '## ', '#  ', '#  '],
    'Q': [' # ', '# #', '# #', '##:', ' ##'],
    'R': ['## ', '# #', '## ', '## ', '# #'],
    'S': [' ##', '#  ', ' # ', '  #', '## '],
    'T': ['###', ' # ', ' # ', ' # ', ' # '],
    'U': ['# #', '# #', '# #', '# #', '###'],
    'V': ['# #', '# #', '# #', '# #', ' # '],
    'W': ['# #', '# #', '# #', '###', '# #'],
    'X': ['# #', '# #', ' # ', '# #', '# #'],
    'Y': ['# #', '# #', ' # ', ' # ', ' # '],
    'Z': ['###', '  #', ' # ', '#  ', '###'],
    '0': [' # ', '# #', '# #', '# #', ' # '],
    '1': [' # ', '## ', ' # ', ' # ', '###'],
    '2': [' # ', '# #', ' # ', '#  ', '###'],
    '3': ['## ', '  #', ' ##', '  #', '## '],
    '4': ['# #', '# #', '###', '  #', '  #'],
    '5': ['###', '#  ', '## ', '  #', '## '],
    '6': [' # ', '#  ', '## ', '# #', ' # '],
    '7': ['###', '  #', ' # ', '#  ', '#  '],
    '8': [' # ', '# #', ' # ', '# #', ' # '],
    '9': [' # ', '# #', ' ##', '  #', ' # '],
    ' ': ['   ', '   ', '   ', '   ', '   '],
    '!': [' # ', ' # ', ' # ', '   ', ' # '],
    '.': ['   ', '   ', '   ', '   ', ' # '],
    '-': ['   ', '   ', '###', '   ', '   '],
    ':': ['   ', ' # ', '   ', ' # ', '   '],
};

const CHAR_HEIGHT = 5;
const CHAR_WIDTH  = 3;

/**
 * BigText — renders text as large 5×3 ASCII art banner characters.
 *
 * Supports A–Z (uppercase), 0–9, and common punctuation.
 * Unrecognized characters fall back to a narrow glyph.
 */
export class BigText extends Widget {
    private _text: string;
    private _color: Color;

    constructor(text: string, style: Partial<Style> = {}, opts: BigTextOptions = {}) {
        super(style);
        this._text = text.toUpperCase();
        this._color = opts.color ?? { type: 'named', name: 'white' };
    }

    setText(text: string): void {
        const normalized = text.toUpperCase();
        if (normalized === this._text) {
            return;
        }
        this._text = normalized;
        this.markDirty();
    }

    getText(): string {
        return this._text;
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const fg = this._color;

        let curX = x;

        for (const ch of this._text) {
            const glyph = CHAR_MAP[ch] ?? ['   ', '   ', '   ', '   ', '   '];
            const glyphWidth = glyph[0]?.length ?? CHAR_WIDTH;

            if (curX + glyphWidth > x + width) break;

            for (let row = 0; row < CHAR_HEIGHT && row < height; row++) {
                const rowStr = glyph[row] ?? '';
                for (let col = 0; col < rowStr.length; col++) {
                    if (rowStr[col] !== ' ') {
                        screen.setCell(curX + col, y + row, {
                            char: caps.unicode ? '█' : '#',
                            ...attrs,
                            fg
                        });
                    }
                }
            }

            // Advance with 1 col gap between characters
            curX += glyphWidth + 1;
        }
    }
}
