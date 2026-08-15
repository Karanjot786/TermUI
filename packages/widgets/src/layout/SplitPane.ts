// ─────────────────────────────────────────────────────
// @termuijs/widgets — SplitPane layout widget
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type KeyEvent,
    caps,
    styleToCellAttrs,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export type SplitDirection = 'horizontal' | 'vertical';

export interface SplitPaneOptions {
    ratio?: number;
    minSize?: number;
    maxSize?: number;
    direction?: SplitDirection;
    persistent?: boolean;
    gutterSize?: number;
    collapsible?: boolean;
    collapsed?: boolean;
    onResize?: (ratio: number) => void;
    onCollapse?: (collapsed: boolean) => void;
}

/**
 * SplitPane — two-pane resizable layout widget.
 *
 * Supports:
 * - Horizontal and vertical splits
 * - Keyboard resizing (Shift+Arrow keys)
 * - Mouse drag resizing
 * - Minimum/maximum size limits
 * - Collapsible panes with toggle
 * - Nested layouts (children can be SplitPanes themselves)
 * - Layout persistence via saveLayout/loadLayout
 */
export class SplitPane extends Widget {
    private _ratio: number;
    private readonly _minSize: number;
    private readonly _maxSize: number;
    private _direction: SplitDirection;
    private readonly _persistent: boolean;
    private readonly _gutterSize: number;
    private readonly _collapsible: boolean;
    private _collapsed: boolean;
    private _collapsedSide: 'left' | 'right' = 'left';
    private _onResize?: (ratio: number) => void;
    private _onCollapse?: (collapsed: boolean) => void;

    constructor(
        left: Widget,
        right: Widget,
        style: Partial<Style> = {},
        opts: SplitPaneOptions = {},
    ) {
        super(style);

        this._ratio = opts.ratio ?? 0.5;
        this._minSize = opts.minSize ?? 1;
        this._maxSize = opts.maxSize ?? 0;
        this._direction = opts.direction ?? 'horizontal';
        this._persistent = opts.persistent ?? false;
        this._gutterSize = opts.gutterSize ?? 1;
        this._collapsible = opts.collapsible ?? false;
        this._collapsed = opts.collapsed ?? false;
        this._onResize = opts.onResize;
        this._onCollapse = opts.onCollapse;

        this.focusable = true;
        this.addChild(left);
        this.addChild(right);
    }

    getRatio(): number {
        return this._ratio;
    }

    setRatio(ratio: number): void {
        const content = this._getContentRect();

        const totalSize =
            this._direction === 'horizontal'
                ? content.width
                : content.height;

        const newRatio =
            totalSize > 0 ? this._clampRatio(ratio, totalSize) : ratio;

        if (newRatio !== this._ratio) {
            this._ratio = newRatio;
            this._onResize?.(newRatio);
            this.markDirty();
        }
    }

    getDirection(): SplitDirection {
        return this._direction;
    }

    setDirection(direction: SplitDirection): void {
        if (direction !== this._direction) {
            this._direction = direction;
            this.markDirty();
        }
    }

    isCollapsed(): boolean {
        return this._collapsed;
    }

    toggleCollapse(): void {
        if (!this._collapsible) return;
        this._collapsed = !this._collapsed;
        this._onCollapse?.(this._collapsed);
        this.markDirty();
    }

    collapse(side: 'left' | 'right' = 'left'): void {
        if (!this._collapsible) return;
        this._collapsed = true;
        this._collapsedSide = side;
        this._onCollapse?.(true);
        this.markDirty();
    }

    expand(): void {
        if (!this._collapsible) return;
        this._collapsed = false;
        this._onCollapse?.(false);
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        if (!event.shift) return;

        const content = this._getContentRect();

        const totalSize =
            this._direction === 'horizontal'
                ? content.width
                : content.height;

        if (totalSize <= 0) return;

        const step = Math.max(1 / totalSize, 0.01);

        if (
            (this._direction === 'horizontal' &&
                event.key === 'left') ||
            (this._direction === 'vertical' &&
                event.key === 'up')
        ) {
            this.setRatio(this._ratio - step);
        } else if (
            (this._direction === 'horizontal' &&
                event.key === 'right') ||
            (this._direction === 'vertical' &&
                event.key === 'down')
        ) {
            this.setRatio(this._ratio + step);
        } else if (event.key === 'space' && this._collapsible) {
            this.toggleCollapse();
        }
    }

    private _dragging = false;

    /**
     * Grabbing a divider that renders exactly one cell wide is hard to hit
     * with a mouse, so accept a click within this many cells of the
     * rendered divider position as a valid grab.
     */
    private static readonly DIVIDER_HIT_TOLERANCE = 1;

    handleMouse(event: import('@termuijs/core').MouseEvent): void {
        const { x, y, width, height } = this._getContentRect();
        if (width <= 0 || height <= 0) return;

        if (this._direction === 'horizontal') {
            const dividerX = x + Math.floor(this._ratio * width);

            if (event.type === 'mousedown' && event.button === 'left') {
                if (Math.abs(event.x - dividerX) <= SplitPane.DIVIDER_HIT_TOLERANCE) {
                    this._dragging = true;
                }
            } else if ((event.type === 'mousemove' || event.type === 'drag') && this._dragging) {
                const newRatio = (event.x - x) / width;
                this.setRatio(newRatio);
            } else if (event.type === 'mouseup' || event.type === 'dragend') {
                this._dragging = false;
            }
        } else {
            const dividerY = y + Math.floor(this._ratio * height);

            if (event.type === 'mousedown' && event.button === 'left') {
                if (Math.abs(event.y - dividerY) <= SplitPane.DIVIDER_HIT_TOLERANCE) {
                    this._dragging = true;
                }
            } else if ((event.type === 'mousemove' || event.type === 'drag') && this._dragging) {
                const newRatio = (event.y - y) / height;
                this.setRatio(newRatio);
            } else if (event.type === 'mouseup' || event.type === 'dragend') {
                this._dragging = false;
            }
        }
    }

    saveLayout(): string {
        if (!this._persistent) {
            return '';
        }

        const leftChild = this._children[0];
        const rightChild = this._children[1];

        return JSON.stringify({
            ratio: this._ratio,
            direction: this._direction,
            collapsed: this._collapsed,
            collapsedSide: this._collapsedSide,
            leftLayout: leftChild instanceof SplitPane ? leftChild.saveLayout() : undefined,
            rightLayout: rightChild instanceof SplitPane ? rightChild.saveLayout() : undefined,
        });
    }

    loadLayout(data: string): void {
        try {
            const layout = JSON.parse(data);

            let changed = false;

            if (
                typeof layout.ratio === 'number' &&
                layout.ratio !== this._ratio
            ) {
                const content = this._getContentRect();
                const totalSize = this._direction === 'horizontal' ? content.width : content.height;
                this._ratio = totalSize > 0
                    ? this._clampRatio(layout.ratio, totalSize)
                    : layout.ratio;
                changed = true;
            }

            if (
                layout.direction === 'horizontal' ||
                layout.direction === 'vertical'
            ) {
                if (layout.direction !== this._direction) {
                    this._direction = layout.direction;
                    changed = true;
                }
            }

            if (typeof layout.collapsed === 'boolean') {
                this._collapsed = layout.collapsed;
                changed = true;
            }

            if (layout.collapsedSide === 'left' || layout.collapsedSide === 'right') {
                this._collapsedSide = layout.collapsedSide;
                changed = true;
            }

            // Recursively load nested layouts
            const leftChild = this._children[0];
            const rightChild = this._children[1];
            if (leftChild instanceof SplitPane && layout.leftLayout) {
                leftChild.loadLayout(layout.leftLayout);
            }
            if (rightChild instanceof SplitPane && layout.rightLayout) {
                rightChild.loadLayout(layout.rightLayout);
            }

            if (changed) {
                this.markDirty();
            }
        } catch {
            // Ignore malformed layout data
        }
    }

    override syncLayout(): void {
        super.syncLayout();
        this._positionChildren();
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();

        if (width <= 0 || height <= 0) {
            return;
        }

        const attrs = styleToCellAttrs(this._style);

        if (this._direction === 'horizontal') {
            const firstSize = this._collapsed ? 0 : Math.floor(this._ratio * width);
            const dividerX = x + firstSize;

            // Render divider line
            const dividerChar = caps.unicode ? '│' : '|';
            for (let row = 0; row < height; row++) {
                screen.setCell(dividerX, y + row, {
                    char: dividerChar,
                    ...attrs,
                });
            }

            // Render collapse indicator if collapsible
            if (this._collapsible && height > 0) {
                const indicator = this._collapsed
                    ? (caps.unicode ? '▶' : '>')
                    : (caps.unicode ? '◀' : '<');
                screen.setCell(dividerX, y + Math.floor(height / 2), {
                    char: indicator,
                    ...attrs,
                    bold: true,
                });
            }
        } else {
            const firstSize = this._collapsed ? 0 : Math.floor(this._ratio * height);
            const dividerY = y + firstSize;

            // Render divider line
            for (let col = 0; col < width; col++) {
                screen.setCell(col + x, dividerY, {
                    char: '─',
                    ...attrs,
                });
            }

            // Render collapse indicator if collapsible
            if (this._collapsible && width > 0) {
                const indicator = this._collapsed
                    ? (caps.unicode ? '▼' : 'v')
                    : (caps.unicode ? '▲' : '^');
                screen.setCell(x + Math.floor(width / 2), dividerY, {
                    char: indicator,
                    ...attrs,
                    bold: true,
                });
            }
        }
    }

    private _clampRatio(
        ratio: number,
        totalSize: number,
    ): number {
        const minRatio = this._minSize / totalSize;
        const maxRatio = this._maxSize > 0
            ? this._maxSize / totalSize
            : 1 - this._minSize / totalSize;

        return Math.max(minRatio, Math.min(maxRatio, ratio));
    }

    private _positionChildren(): void {
        const left = this._children[0];
        const right = this._children[1];

        if (!left || !right) {
            return;
        }

        const { x, y, width, height } = this._getContentRect();

        if (width <= 0 || height <= 0) {
            return;
        }

        if (this._collapsed) {
            if (this._collapsedSide === 'left') {
                // Collapse left pane, right takes full space
                left.updateRect({ x, y, width: 0, height: 0 });
                right.updateRect({ x, y, width, height });
            } else {
                // Collapse right pane, left takes full space
                left.updateRect({ x, y, width, height });
                right.updateRect({ x, y, width: 0, height: 0 });
            }
            return;
        }

        if (this._direction === 'horizontal') {
            const firstWidth = Math.floor(this._ratio * width);

            left.updateRect({
                x,
                y,
                width: firstWidth,
                height,
            });

            right.updateRect({
                x: x + firstWidth + this._gutterSize,
                y,
                width: Math.max(0, width - firstWidth - this._gutterSize),
                height,
            });
        } else {
            const firstHeight = Math.floor(this._ratio * height);

            left.updateRect({
                x,
                y,
                width,
                height: firstHeight,
            });

            right.updateRect({
                x,
                y: y + firstHeight + this._gutterSize,
                width,
                height: Math.max(0, height - firstHeight - this._gutterSize),
            });
        }
    }
}