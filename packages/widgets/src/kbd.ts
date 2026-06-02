// ─────────────────────────────────────────────────────
// @termuijs/widgets — Kbd widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, stringWidth, caps } from '@termuijs/core';
import { Widget } from './base/Widget.js';

export interface KbdOptions {
    // Standard options for future expansion
}

/** Background color — gray to simulate a physical key. */
const BG_COLOR: Color = { type: 'named', name: 'white' };

/** Foreground color — white or black for readability. */
const FG_COLOR: Color = { type: 'named', name: 'black' };

/**
 * Kbd — an inline label representing a keyboard input.
 *
 * Used for displaying hotkeys or shortcuts (e.g., "Ctrl + C").
 * Renders an inline block with a distinct background to simulate a key press.
 */
export class Kbd extends Widget {
    private _text: string;

    constructor(text: string, opts: KbdOptions = {}, style: Partial<Style> = {}) {
        super(style);
        this._text = text;
    }

    /** Update the kbd text. */
    setText(text: string): void {
        this._text = text;
        this.markDirty();
    }

    /** Get the current kbd text. */
    getText(): string {
        return this._text;
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const bg = BG_COLOR;
        const fg = FG_COLOR;
        
        const contentAttrs = { fg, bg, bold: false };

        // Padded text to look like a physical button: " text "
        const padded = ` ${this._text} `;
        
        // Ensure we don't render outside the assigned widget width
        const innerWidth = Math.min(stringWidth(padded), width);

        // ── Row 0: content row (Inline Key) ──
        if (height >= 1) {
            // Choose border brackets based on unicode support for extra styling
            const leftBracket = caps.unicode ? '⟨' : '[';
            const rightBracket = caps.unicode ? '⟩' : ']';
            
            // Draw left bracket
            screen.setCell(x, y, { char: leftBracket, ...contentAttrs });

            // Write the actual padded key text
            const visibleText = padded.slice(0, innerWidth - 2); 
            screen.writeString(x + 1, y, visibleText, contentAttrs);

            // Draw right bracket if space allows
            if (innerWidth >= 2) {
                 screen.setCell(x + innerWidth - 1, y, { char: rightBracket, ...contentAttrs });
            }

            // Fill any remaining widget space with background
            for (let c = innerWidth; c < width; c++) {
                screen.setCell(x + c, y, { char: ' ', ...contentAttrs });
            }
        }
    }
}