// ─────────────────────────────────────────────────────
// @termuijs/widgets — Box widget
// ─────────────────────────────────────────────────────

import type { Screen, Style } from '@termuijs/core';
import { styleToCellAttrs } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

/**
 * Box — the fundamental container widget, similar to a `<div>`.
 *
 * Supports:
 * - Flexbox layout (row/column)
 * - Border styles (single/double/round/heavy/dashed)
 * - Padding and margin
 * - Background color
 */
export class Box extends Widget {
    constructor(style: Partial<Style> = {}) {
        super(style);
    }
    /** Check if this Box has no children */
    isEmpty(): boolean {
        return this._children.length === 0;
    }

    protected _renderSelf(screen: Screen): void {
        const { bg } = styleToCellAttrs(this._style);
        if (bg.type === 'none') return;

        const { x, y, width, height } = this._rect;
        const border = this._style.border && this._style.border !== 'none' ? 1 : 0;

        // Fill background
        for (let r = border; r < height - border; r++) {
            for (let c = border; c < width - border; c++) {
                screen.setCell(x + c, y + r, { char: ' ', bg });
            }
        }
    }
}
