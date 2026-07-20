// ─────────────────────────────────────────────────────
// @termuijs/widgets — LayoutDebug overlay widget
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type KeyEvent,
    styleToCellAttrs,
    caps,
    defaultStyle,
    mergeStyles,
    truncate,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface LayoutDebugOptions {
    /** Show padding boundaries. Default: true */
    showPadding?: boolean;
    /** Show margin boundaries. Default: true */
    showMargin?: boolean;
    /** Show widget bounds. Default: true */
    showBounds?: boolean;
    /** Show widget labels. Default: true */
    showLabels?: boolean;
    /** Show grid lines. Default: false */
    showGrid?: boolean;
    /** Grid size in cells. Default: 8 */
    gridSize?: number;
    /** Toggle shortcut key. Default: 'd' */
    toggleKey?: string;
    /** Whether the overlay is visible by default. Default: false */
    visible?: boolean;
}

const DEFAULT_OPTIONS: Required<LayoutDebugOptions> = {
    showPadding: true,
    showMargin: true,
    showBounds: true,
    showLabels: true,
    showGrid: false,
    gridSize: 8,
    toggleKey: 'd',
    visible: false,
};

export interface LayoutDebugInfo {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    padding?: { top: number; right: number; bottom: number; left: number };
    margin?: { top: number; right: number; bottom: number; left: number };
    label?: string;
}

/**
 * LayoutDebug — a debug overlay for visualizing layout boundaries.
 *
 * Shows:
 * - Widget bounds (rectangles around each widget)
 * - Padding (inner boundary)
 * - Margin (outer boundary)
 * - Grid overlay
 * - Widget labels
 *
 * Keyboard shortcuts:
 * - Toggle key (default 'd') — show/hide overlay
 * - 'g' — toggle grid
 * - 'p' — toggle padding
 * - 'm' — toggle margins
 * - 'b' — toggle bounds
 * - 'l' — toggle labels
 */
export class LayoutDebug extends Widget {
    private _opts: Required<LayoutDebugOptions>;
    private _widgets: LayoutDebugInfo[] = [];
    private _enabled: boolean;

    focusable = true;

    constructor(options: LayoutDebugOptions = {}, style: Partial<Style> = {}) {
        super(mergeStyles(defaultStyle(), style));
        this._opts = { ...DEFAULT_OPTIONS, ...options };
        this._enabled = this._opts.visible;
    }

    /** Update the list of widgets to visualize */
    setWidgets(widgets: LayoutDebugInfo[]): void {
        this._widgets = widgets;
        this.markDirty();
    }

    /** Toggle the overlay visibility */
    toggle(): void {
        this._enabled = !this._enabled;
        this.markDirty();
    }

    /** Show the overlay */
    show(): void {
        this._enabled = true;
        this.markDirty();
    }

    /** Hide the overlay */
    hide(): void {
        this._enabled = false;
        this.markDirty();
    }

    /** Check if the overlay is visible */
    get isVisible(): boolean {
        return this._enabled;
    }

    /** Update a specific option */
    setOption<K extends keyof LayoutDebugOptions>(key: K, value: LayoutDebugOptions[K]): void {
        this._opts[key] = value as Required<LayoutDebugOptions>[K];
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        const key = event.key.toLowerCase();
        if (key === this._opts.toggleKey) {
            event.stopPropagation();
            this.toggle();
            return;
        }
        if (key === 'g') {
            event.stopPropagation();
            this.setOption('showGrid', !this._opts.showGrid);
            return;
        }
        if (key === 'p') {
            event.stopPropagation();
            this.setOption('showPadding', !this._opts.showPadding);
            return;
        }
        if (key === 'm') {
            event.stopPropagation();
            this.setOption('showMargin', !this._opts.showMargin);
            return;
        }
        if (key === 'b') {
            event.stopPropagation();
            this.setOption('showBounds', !this._opts.showBounds);
            return;
        }
        if (key === 'l') {
            event.stopPropagation();
            this.setOption('showLabels', !this._opts.showLabels);
            return;
        }
    }

    protected _renderSelf(screen: Screen): void {
        if (!this._enabled) return;
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Draw grid if enabled
        if (this._opts.showGrid) {
            this._renderGrid(screen, x, y, width, height, attrs);
        }

        // Draw each widget
        for (const widget of this._widgets) {
            this._renderWidget(screen, widget, attrs);
        }

        // Draw debug panel at bottom
        this._renderDebugPanel(screen, x, y + height - 1, width, attrs);
    }

    private _renderGrid(screen: Screen, x: number, y: number, width: number, height: number, attrs: Record<string, unknown>): void {
        const gridSize = this._opts.gridSize;
        const gridColor: Record<string, unknown> = { ...attrs, fg: { type: 'named', name: 'brightBlack' }, dim: true };

        for (let gx = x; gx < x + width; gx += gridSize) {
            for (let gy = y; gy < y + height; gy++) {
                screen.setCell(gx, gy, { char: '│', ...gridColor });
            }
        }
        for (let gy = y; gy < y + height; gy += gridSize) {
            for (let gx = x; gx < x + width; gx++) {
                screen.setCell(gx, gy, { char: '─', ...gridColor });
            }
        }
    }

    private _renderWidget(screen: Screen, widget: LayoutDebugInfo, attrs: Record<string, unknown>): void {
        const boundsColor: Record<string, unknown> = { ...attrs, fg: { type: 'named', name: 'cyan' } };
        const paddingColor: Record<string, unknown> = { ...attrs, fg: { type: 'named', name: 'yellow' } };
        const marginColor: Record<string, unknown> = { ...attrs, fg: { type: 'named', name: 'magenta' } };
        const labelColor: Record<string, unknown> = { ...attrs, fg: { type: 'named', name: 'white' }, bold: true };

        // Draw margin
        if (this._opts.showMargin && widget.margin) {
            const mx = widget.x - widget.margin.left;
            const my = widget.y - widget.margin.top;
            const mw = widget.width + widget.margin.left + widget.margin.right;
            const mh = widget.height + widget.margin.top + widget.margin.bottom;
            this._drawRect(screen, mx, my, mw, mh, marginColor);
        }

        // Draw bounds
        if (this._opts.showBounds) {
            this._drawRect(screen, widget.x, widget.y, widget.width, widget.height, boundsColor);
        }

        // Draw padding
        if (this._opts.showPadding && widget.padding) {
            const px = widget.x + widget.padding.left;
            const py = widget.y + widget.padding.top;
            const pw = widget.width - widget.padding.left - widget.padding.right;
            const ph = widget.height - widget.padding.top - widget.padding.bottom;
            this._drawRect(screen, px, py, Math.max(1, pw), Math.max(1, ph), paddingColor);
        }

        // Draw label
        if (this._opts.showLabels && widget.label) {
            const label = truncate(widget.label, widget.width - 2);
            screen.writeString(widget.x + 1, widget.y + 1, label, labelColor);
        }
    }

    private _drawRect(screen: Screen, x: number, y: number, width: number, height: number, attrs: Record<string, unknown>): void {
        if (width <= 0 || height <= 0) return;
        const tl = caps.unicode ? '┌' : '+';
        const tr = caps.unicode ? '┐' : '+';
        const bl = caps.unicode ? '└' : '+';
        const br = caps.unicode ? '┘' : '+';
        const h = caps.unicode ? '─' : '-';
        const v = caps.unicode ? '│' : '|';

        // Top
        screen.writeString(x, y, tl + h.repeat(Math.max(0, width - 2)) + tr, attrs);
        // Bottom
        screen.writeString(x, y + height - 1, bl + h.repeat(Math.max(0, width - 2)) + br, attrs);
        // Sides
        for (let r = 1; r < height - 1; r++) {
            screen.writeString(x, y + r, v, attrs);
            screen.writeString(x + width - 1, y + r, v, attrs);
        }
    }

    private _renderDebugPanel(screen: Screen, x: number, y: number, width: number, attrs: Record<string, unknown>): void {
        const panelColor: Record<string, unknown> = { ...attrs, fg: { type: 'named', name: 'brightBlack' }, dim: true };
        const statusColor: Record<string, unknown> = { ...attrs, fg: { type: 'named', name: 'green' }, bold: true };

        const status = this._enabled ? 'ON' : 'OFF';
        const parts = [
            `LayoutDebug: ${status}`,
            `Grid:${this._opts.showGrid ? 'ON' : 'OFF'}`,
            `Pad:${this._opts.showPadding ? 'ON' : 'OFF'}`,
            `Marg:${this._opts.showMargin ? 'ON' : 'OFF'}`,
            `Bnd:${this._opts.showBounds ? 'ON' : 'OFF'}`,
            `Lbl:${this._opts.showLabels ? 'ON' : 'OFF'}`,
        ];

        let cx = x;
        for (const part of parts) {
            if (cx + part.length > x + width) break;
            screen.writeString(cx, y, part, panelColor);
            cx += part.length + 1;
        }
    }
}
