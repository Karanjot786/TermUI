// ─────────────────────────────────────────────────────
// @termuijs/widgets — Kbd widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, stringWidth, caps, truncate } from '@termuijs/core';
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

        // ── Row 0: content row (Inline Key) ──
        if (height >= 1) {
            // Choose border brackets based on unicode support for extra styling
            const leftBracket = caps.unicode ? '⟨' : '[';
            const rightBracket = caps.unicode ? '⟩' : ']';
            
            // 1. Calculate a strict visual text layout budget (total width minus 2 cells for brackets)
            const textBudget = Math.max(0, width - 2);

            // 2. Safely truncate using the framework's native utility to protect wide characters
            const visibleText = truncate(padded, textBudget, '');
            const visibleWidth = stringWidth(visibleText);

            // 3. Write the opening bracket at starting x coordinate
            screen.setCell(x, y, { char: leftBracket, ...contentAttrs });

            // 4. Write the content string shifted by 1 cell
            screen.writeString(x + 1, y, visibleText, contentAttrs);

            // 5. Place the closing bracket exactly after the opening bracket + actual visual string width
            if (width >= 2) {
                screen.setCell(x + 1 + visibleWidth, y, { char: rightBracket, ...contentAttrs });
            }

            // 6. Fill any remaining widget space with background
            const usedWidth = width >= 2 ? visibleWidth + 2 : 1;
            for (let c = usedWidth; c < width; c++) {
                screen.setCell(x + c, y, { char: ' ', ...contentAttrs });
            }
        }
    }
}