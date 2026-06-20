// ─────────────────────────────────────────────────────
// @termuijs/widgets — SplitPane layout widget
// ─────────────────────────────────────────────────────

import { type Screen, type Style, type KeyEvent, caps, styleToCellAttrs } from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export type SplitDirection = 'horizontal' | 'vertical';

export interface SplitPaneOptions {
    ratio?: number;
    minSize?: number;
    direction?: SplitDirection;
    persistent?: boolean;
}

/**
 * SplitPane — two-pane horizontal layout with a draggable divider.
 *
 * The left pane occupies columns [0, leftWidth − 1], the divider sits at
 * leftWidth, and the right pane occupies [leftWidth + 1, totalWidth − 1].
 * Use shift+left / shift+right to resize when focused.
 */
export class SplitPane extends Widget {
    private _ratio: number;
    private readonly _minSize: number;
    private readonly _direction: SplitDirection;
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
        const totalWidth = this._getContentRect().width;
        this._ratio = totalWidth > 0 ? this._clampRatio(ratio, totalWidth) : ratio;
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        if (!event.shift) return;

        const totalWidth = this._getContentRect().width;
        if (totalWidth <= 0) return;

        const step = 1 / totalWidth;
        if (
            (this._direction === 'horizontal' && event.key === 'left') ||
            (this._direction === 'vertical' && event.key === 'up')
        ) {
            this.setRatio(this._ratio - step);
        } else if (
            (this._direction === 'horizontal' && event.key === 'right') ||
            (this._direction === 'vertical' && event.key === 'down')
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
    const layout = JSON.parse(data);
    this._ratio = layout.ratio ?? this._ratio;
    this.markDirty();
}

    override syncLayout(): void {
        super.syncLayout();
        this._positionChildren();
    }

    protected _renderSelf(screen: Screen): void {
        const content = this._getContentRect();
        const { x, y, width, height } = content;
        if (width <= 0 || height <= 0) return;

        const leftWidth = Math.floor(this._ratio * width);
        const dividerX = x + leftWidth;
        const dividerChar = caps.unicode ? '│' : '|';
        const attrs = styleToCellAttrs(this._style);

        for (let row = 0; row < height; row++) {
            screen.setCell(dividerX, y + row, { char: dividerChar, ...attrs });
        }
    }

    private _clampRatio(ratio: number, totalWidth: number): number {
        const minRatio = this._minSize / totalWidth;
        const maxRatio = 1 - this._minSize / totalWidth;
        return Math.max(minRatio, Math.min(maxRatio, ratio));
    }

    private _positionChildren(): void {
        const left = this._children[0];
        const right = this._children[1];
        if (!left || !right) return;

        const content = this._getContentRect();
        const totalWidth = content.width;
        if (totalWidth <= 0) return;

        const leftWidth = Math.floor(this._ratio * totalWidth);

        left.updateRect({
            x: content.x,
            y: content.y,
            width: leftWidth,
            height: content.height,
        });

        right.updateRect({
            x: content.x + leftWidth + 1,
            y: content.y,
            width: Math.max(0, totalWidth - leftWidth - 1),
            height: content.height,
        });
    }
}
