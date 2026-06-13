// ─────────────────────────────────────────────────────
// @termuijs/widgets — ProgressCircle widget
//
// Renders a progress value (0–1) as a braille "arc" when
// unicode is available, or a `[####----]`-style bar in
// ASCII. Optionally shows a percentage label centered
// on the same line as the indicator.
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type Color, styleToCellAttrs, caps, stringWidth } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface ProgressCircleOptions {
    /** Current value in the range 0–1. Clamped. */
    value?: number;
    /** Color of the filled portion. */
    fillColor?: Color;
    /** Show a " XX%" label next to the indicator. */
    showLabel?: boolean;
}

/**
 * ProgressCircle — compact circular-style progress meter.
 *
 * In unicode mode the filled and empty portions use 8-dot
 * braille characters (`⣿` and `⠿`) at different dot
 * densities to suggest a filling arc. In ASCII mode the
 * widget falls back to a bracketed bar (`[####----]`).
 *
 * Example:
 *   new ProgressCircle({ width: 12, height: 3 }, { showLabel: true })
 *   circle.setValue(0.72);
 */
export class ProgressCircle extends Widget {
    private _value: number;
    private _fillColor: Color;
    private _showLabel: boolean;

    constructor(style: Partial<Style> = {}, options: ProgressCircleOptions = {}) {
        super(style);
        this._value = clamp01(options.value ?? 0);
        this._fillColor = options.fillColor ?? { type: 'named', name: 'green' };
        this._showLabel = options.showLabel ?? false;
    }

    /** Update the current progress. Out-of-range values are clamped to [0, 1]. */
    setValue(value: number): void {
        const nextValue = clamp01(value);
            if (this._value === nextValue) {
            return;
        }
        this._value = clamp01(value);
        this.markDirty();
    }

    /** Current clamped progress value in the range [0, 1]. */
    get value(): number { return this._value; }

    /** Color applied to the filled portion. */
    get fillColor(): Color { return this._fillColor; }
    set fillColor(color: Color) {
        this._fillColor = color;
        this.markDirty();
    }

    /** Whether the " XX%" label is rendered alongside the indicator. */
    get showLabel(): boolean { return this._showLabel; }
    set showLabel(v: boolean) {
        this._showLabel = v;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        if (caps.unicode) {
            this._renderBraille(screen, x, y, width, height, attrs);
        } else {
            this._renderAscii(screen, x, y, width, height, attrs);
        }
    }

    private _renderAscii(
        screen: Screen,
        x: number, y: number, width: number, height: number,
        attrs: ReturnType<typeof styleToCellAttrs>,
    ): void {
        const barY = y + Math.floor((height - 1) / 2);
        const labelStr = this._showLabel ? ` ${Math.round(this._value * 100)}%` : '';
        const labelWidth = stringWidth(labelStr);

        // Need at least 2 cells for the brackets, plus any label width.
        const innerWidth = Math.max(1, width - 2 - labelWidth);
        const filled = Math.min(innerWidth, Math.round(innerWidth * this._value));
        const empty = innerWidth - filled;

        let col = x;
        screen.setCell(col, barY, { char: '[', ...attrs });
        col += 1;
        for (let i = 0; i < filled; i++) {
            screen.setCell(col + i, barY, { char: '#', ...attrs, fg: this._fillColor });
        }
        for (let i = 0; i < empty; i++) {
            screen.setCell(col + filled + i, barY, { char: '-', ...attrs, dim: true });
        }
        col += innerWidth;
        screen.setCell(col, barY, { char: ']', ...attrs });
        col += 1;

        if (this._showLabel && labelStr) {
            screen.writeString(col, barY, labelStr, { ...attrs, bold: true });
        }
    }

    private _renderBraille(
        screen: Screen,
        x: number, y: number, width: number, height: number,
        attrs: ReturnType<typeof styleToCellAttrs>,
    ): void {
        const barY = y + Math.floor((height - 1) / 2);
        const labelStr = this._showLabel ? ` ${Math.round(this._value * 100)}%` : '';
        const labelWidth = stringWidth(labelStr);

        // Each braille char is one terminal column.
        const innerWidth = Math.max(1, width - labelWidth);
        const filled = Math.min(innerWidth, Math.round(innerWidth * this._value));
        const empty = innerWidth - filled;

        let col = x;
        for (let i = 0; i < filled; i++) {
            screen.setCell(col + i, barY, { char: '⣿', ...attrs, fg: this._fillColor });
        }
        for (let i = 0; i < empty; i++) {
            screen.setCell(col + filled + i, barY, { char: '⠿', ...attrs, dim: true });
        }
        col += innerWidth;

        if (this._showLabel && labelStr) {
            screen.writeString(col, barY, labelStr, { ...attrs, bold: true });
        }
    }
}

function clamp01(n: number): number {
    if (Number.isNaN(n)) return 0;
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
}
