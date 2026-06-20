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
    direction?: SplitDirection;
    persistent?: boolean;
}

/**
 * SplitPane — two-pane resizable layout widget.
 */
export class SplitPane extends Widget {
    private _ratio: number;
    private readonly _minSize: number;
    private _direction: SplitDirection;
    private readonly _persistent: boolean;

    constructor(
        left: Widget,
        right: Widget,
        style: Partial<Style> = {},
        opts: SplitPaneOptions = {},
    ) {
        super(style);

        this._ratio = opts.ratio ?? 0.5;
        this._minSize = opts.minSize ?? 1;
        this._direction = opts.direction ?? 'horizontal';
        this._persistent = opts.persistent ?? false;

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
            this.markDirty();
        }
    }

    handleKey(event: KeyEvent): void {
        if (!event.shift) return;

        const content = this._getContentRect();

        const totalSize =
            this._direction === 'horizontal'
                ? content.width
                : content.height;

        if (totalSize <= 0) return;

        const step = 1 / totalSize;

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
        }
    }

    saveLayout(): string {
        if (!this._persistent) {
            return '';
        }

        return JSON.stringify({
            ratio: this._ratio,
            direction: this._direction,
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
                this._ratio = layout.ratio;
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

        const dividerChar = caps.unicode ? '│' : '|';
        const attrs = styleToCellAttrs(this._style);

        if (this._direction === 'horizontal') {
            const firstSize = Math.floor(this._ratio * width);
            const dividerX = x + firstSize;

            for (let row = 0; row < height; row++) {
                screen.setCell(dividerX, y + row, {
                    char: dividerChar,
                    ...attrs,
                });
            }
        } else {
            const firstSize = Math.floor(this._ratio * height);
            const dividerY = y + firstSize;

            for (let col = 0; col < width; col++) {
                screen.setCell(col + x, dividerY, {
                    char: '─',
                    ...attrs,
                });
            }
        }
    }

    private _clampRatio(
        ratio: number,
        totalSize: number,
    ): number {
        const minRatio = this._minSize / totalSize;
        const maxRatio = 1 - this._minSize / totalSize;

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

        if (this._direction === 'horizontal') {
            const firstWidth = Math.floor(this._ratio * width);

            left.updateRect({
                x,
                y,
                width: firstWidth,
                height,
            });

            right.updateRect({
                x: x + firstWidth + 1,
                y,
                width: Math.max(0, width - firstWidth - 1),
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
                y: y + firstHeight + 1,
                width,
                height: Math.max(0, height - firstHeight - 1),
            });
        }
    }
}