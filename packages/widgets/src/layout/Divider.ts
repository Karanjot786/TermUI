// ─────────────────────────────────────────────────────
// @termuijs/widgets — Divider widget
// Renders a horizontal or vertical line with optional label
// ─────────────────────────────────────────────────────
import {
    type Screen,
    type Style,
    type Color,
    styleToCellAttrs,
    stringWidth,
    caps,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export type DividerOrientation = 'horizontal' | 'vertical';

export interface DividerOptions {
    /** Direction of the divider line */
    orientation?: DividerOrientation;
    /** Optional centered label inside the line */
    label?: string;
    /** Character used to draw the line (overrides default) */
    char?: string;
    /** Color of the line */
    color?: Color;
}

/**
 * Divider — a horizontal or vertical separator line with optional label.
 *
 * Examples:
 *   ──────────────── Stats ────────────────   (horizontal with label)
 *   ────────────────────────────────────────  (horizontal)
 *   │  (vertical, repeating down the height)
 */
export class Divider extends Widget {
    private _orientation: DividerOrientation;
    private _label: string;
    private _char: string | undefined;
    private _color: Color | undefined;

    constructor(style: Partial<Style> = {}, opts: DividerOptions = {}) {
        super(style);
        this._orientation = opts.orientation ?? 'horizontal';
        this._label = opts.label ?? '';
        this._char = opts.char;
        this._color = opts.color;
    }

    setLabel(label: string): void {
        this._label = label;
        this.markDirty();
    }

    setOrientation(orientation: DividerOrientation): void {
        this._orientation = orientation;
        this.markDirty();
    }

    setChar(char: string): void {
        this._char = char;
        this.markDirty();
    }

    setColor(color: Color): void {
        this._color = color;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const cellAttrs = this._color
            ? { ...attrs, fg: this._color }
            : attrs;

        if (this._orientation === 'horizontal') {
            this._renderHorizontal(screen, x, y, width, cellAttrs);
        } else {
            this._renderVertical(screen, x, y, height, cellAttrs);
        }
    }

    private _renderHorizontal(
        screen: Screen,
        x: number,
        y: number,
        width: number,
        attrs: ReturnType<typeof styleToCellAttrs>,
    ): void {
        const lineChar = this._char ?? (caps.unicode ? '─' : '-');

        if (!this._label) {
            // Simple full-width line
            for (let i = 0; i < width; i++) {
                screen.setCell(x + i, y, { char: lineChar, ...attrs });
            }
            return;
        }

        // Centered label: ─── Label ───
        const labelWithPad = ` ${this._label} `;
        const labelWidth = stringWidth(labelWithPad);

        if (labelWidth >= width) {
            // Not enough room — just write the label truncated
            screen.writeString(x, y, labelWithPad.slice(0, width), attrs);
            return;
        }

        const leftLen = Math.floor((width - labelWidth) / 2);
        const rightLen = width - labelWidth - leftLen;

        // Left line
        for (let i = 0; i < leftLen; i++) {
            screen.setCell(x + i, y, { char: lineChar, ...attrs });
        }

        // Label
        screen.writeString(x + leftLen, y, labelWithPad, attrs);

        // Right line
        for (let i = 0; i < rightLen; i++) {
            screen.setCell(x + leftLen + labelWidth + i, y, {
                char: lineChar,
                ...attrs,
            });
        }
    }

    private _renderVertical(
        screen: Screen,
        x: number,
        y: number,
        height: number,
        attrs: ReturnType<typeof styleToCellAttrs>,
    ): void {
        const lineChar = this._char ?? (caps.unicode ? '│' : '|');

        for (let i = 0; i < height; i++) {
            screen.setCell(x, y + i, { char: lineChar, ...attrs });
        }
    }
}