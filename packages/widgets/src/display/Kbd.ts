// ─────────────────────────────────────────────────────
// @termuijs/widgets — Kbd widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, stringWidth, caps } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface KbdOptions {
    color?: Color;
}

const BG_COLOR: Color = { type: 'named', name: 'white' };
const FG_COLOR: Color = { type: 'named', name: 'black' };

/**
 * Kbd — an inline label representing a keyboard input.
 *
 * Used for displaying hotkeys or shortcuts (e.g., "Ctrl+C").
 * Renders an inline block with a distinct background to simulate a key press.
 */
export class Kbd extends Widget {
    private _keys: string;
    private _opts: KbdOptions;

    constructor(keys: string, style?: Partial<Style>, opts?: KbdOptions) {
        super(style || {});
        this._keys = keys;
        this._opts = opts || {};
    }

    /** Update the kbd keys. */
    setKeys(keys: string): void {
        if (this._keys === keys) return; 
        this._keys = keys;
        this.markDirty();
    }

    /** Get the current kbd keys. */
    getKeys(): string {
        return this._keys;
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const bg = BG_COLOR;
        const fg = FG_COLOR;
        
        // Use opts.color for border if provided, otherwise default to background color
        const borderColor = this._opts.color || bg;

        const textAttrs = { fg, bg, bold: false };
        const borderAttrs = { fg: borderColor, bg, bold: false };
        
        // Separator style uses standard widget style fallback
        const sepAttrs = { 
            fg: this._style.fg || { type: 'named', name: 'white' }, 
            bg: this._style.bg || { type: 'named', name: 'black' }, 
            bold: false 
        };

        const leftBracket = caps.unicode ? '⟨' : '[';
        const rightBracket = caps.unicode ? '⟩' : ']';

        // Split the keys by '+' and trim any accidental whitespace
        const parts = this._keys.split('+').map(p => p.trim());
        let currentX = x;

        if (height >= 1) {
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const padded = ` ${part} `;
                const partWidth = stringWidth(padded) + 2; // +2 for brackets

                // Stop rendering if we exceed the widget's allocated width
                if (currentX - x + partWidth > width) break;

                // Draw left bracket
                screen.setCell(currentX, y, { char: leftBracket, ...borderAttrs });

                // Draw the padded text
                const visibleText = padded.slice(0, partWidth - 2);
                screen.writeString(currentX + 1, y, visibleText, textAttrs);

                // Draw right bracket
                screen.setCell(currentX + partWidth - 1, y, { char: rightBracket, ...borderAttrs });

                currentX += partWidth;

                // Draw separator ' + ' if not the last keycap
                if (i < parts.length - 1) {
                    const sep = ' + ';
                    if (currentX - x + stringWidth(sep) <= width) {
                        screen.writeString(currentX, y, sep, sepAttrs);
                        currentX += stringWidth(sep);
                    }
                }
            }
        }
    }
}