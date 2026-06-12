// ─────────────────────────────────────────────────────
// @termuijs/widgets — MultiProgress widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, styleToCellAttrs, type Color, caps, BLOCK } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

/**
 * A single progress item in MultiProgress
 */
export interface ProgressItem {
    label: string;
    value: number; // 0–1
    color?: Color;  // optional fill color override
}

/**
 * Options for MultiProgress widget
 */
export interface MultiProgressOptions {
    items: ProgressItem[];
    labelWidth?: number; // chars reserved for label column, default: 12
    showValues?: boolean; // show percentage after bar, default: true
}

/**
 * MultiProgress — stacks multiple labeled progress bars in a vertical list.
 *
 * Each item renders on its own row with a label, bar, and optional percentage.
 *
 * Supports:
 * - Multiple items with individual colors
 * - Custom label column width
 * - Optional percentage display
 * - Smooth animation-ready value changes
 */
export class MultiProgress extends Widget {
    private _items: ProgressItem[];
    private _labelWidth: number;
    private _showValues: boolean;

    constructor(options: MultiProgressOptions, style: Partial<Style> = {}) {
        const height = options.items.length;
        super({ height, ...style });
        this._items = options.items.map(item => ({
            ...item,
            value: Math.max(0, Math.min(1, item.value)),
        }));
        this._labelWidth = options.labelWidth ?? 12;
        this._showValues = options.showValues ?? true;
    }

    /**
     * Replace all items and mark dirty
     */
    setItems(items: ProgressItem[]): void {
        this._items = items.map(item => ({
            ...item,
            value: Math.max(0, Math.min(1, item.value)),
        }));
        this.markDirty();
    }

    /**
     * Update a single item's value
     */
    updateItem(index: number, value: number): void {
        if (index >= 0 && index < this._items.length) {
            const normalized = Math.max(0, Math.min(1, value));
    
            if (this._items[index].value === normalized) {
                return;
            }
    
            this._items[index].value = normalized;
            this.markDirty();
        }
    }

    /**
     * Test-only getter for items array
     * @internal
     */
    getItemsForTest(): ProgressItem[] {
        return this._items;
    }

    /**
     * Test-only getter for labelWidth
     * @internal
     */
    getLabelWidthForTest(): number {
        return this._labelWidth;
    }

    /**
     * Test-only getter for showValues
     * @internal
     */
    getShowValuesForTest(): boolean {
        return this._showValues;
    }

    /**
     * Test-only getter for style height
     * @internal
     */
    getHeightForTest(): number {
        // Height is always set as number in constructor (options.items.length)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this._style.height as number;
    }

    /**
     * Test-only setter for dirty state
     * @internal
     */
    setDirtyForTest(value: boolean): void {
        // _dirty is protected in Widget base class; accessible directly from subclass
        this._dirty = value;
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width } = rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Determine bar characters (unicode or ASCII fallback)
        const fillChar = caps.unicode ? '█' : BLOCK.full;   // '█' or '#'
        const emptyChar = caps.unicode ? '░' : BLOCK.empty; // '░' or ' '

        // Render each item on its own row
        for (let i = 0; i < this._items.length; i++) {
            const item = this._items[i];
            const rowY = y + i;
            let colX = x;

            // 1. Render label (left-aligned, truncated/padded to labelWidth)
            const label = item.label.length > this._labelWidth
                ? item.label.substring(0, this._labelWidth)
                : item.label.padEnd(this._labelWidth);
            screen.writeString(colX, rowY, label, attrs);
            colX += this._labelWidth;

            // 2. Space after label
            if (colX < x + width) {
                screen.setCell(colX, rowY, { char: ' ', ...attrs });
                colX++;
            }

            // 3. Calculate bar width (accounting for percentage label if shown)
            let percentLabel = '';
            if (this._showValues) {
                percentLabel = ` ${Math.round(item.value * 100)}%`;
            }
            const barWidth = Math.max(0, x + width - colX - percentLabel.length);
            const filled = Math.round(barWidth * item.value);
            const empty = barWidth - filled;

            // 4. Render filled portion
            const fillColor = item.color ?? { type: 'named', name: 'green' };
            for (let j = 0; j < filled; j++) {
                screen.setCell(colX + j, rowY, { char: fillChar, ...attrs, fg: fillColor });
            }

            // 5. Render empty portion
            for (let j = 0; j < empty; j++) {
                screen.setCell(colX + filled + j, rowY, { char: emptyChar, ...attrs, dim: true });
            }

            // 6. Render percentage label if enabled
            if (percentLabel) {
                const labelX = colX + barWidth;
                screen.writeString(labelX, rowY, percentLabel, { ...attrs, bold: true });
            }
        }
    }
}
