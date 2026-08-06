import { Widget } from '@termuijs/widgets';
import {
    type Style,
    type Screen,
    type KeyEvent,
    caps,
    styleToCellAttrs,
    stringWidth,
    truncate,
} from '@termuijs/core';

export type PopoverPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface PopoverOptions {
    /** The placement of the popover relative to the anchor. Default: 'bottom'. */
    placement?: PopoverPlacement;
    /** Title shown in the panel border. */
    title?: string;
    /** Border color. */
    borderColor?: Style['fg'];
    /** * The specific terminal coordinates (row/col) to anchor this popover to.
     * If omitted, it will attempt to use its own rect as the anchor bounds.
     */
    anchor?: { x: number; y: number };
}

export class Popover extends Widget {
    private _isOpen = false;
    private content: Widget;
    private opts: PopoverOptions;

    constructor(content: Widget, style?: Partial<Style>, opts?: PopoverOptions) {
        super(style);
        this.content = content;
        this.opts = { placement: 'bottom', ...opts };
    }

    get isOpen(): boolean {
        return this._isOpen;
    }

    open(): void {
        if (!this._isOpen) {
            this._isOpen = true;
            this.markDirty();
        }
    }

    close(): void {
        if (this._isOpen) {
            this._isOpen = false;
            this.markDirty();
        }
    }

    toggle(): void {
        this._isOpen ? this.close() : this.open();
    }

    /** Update the anchor coordinates dynamically */
    setAnchor(x: number, y: number): void {
        this.opts.anchor = { x, y };
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        if (!this._isOpen) return;

        if (event.key === 'escape') {
            this.close();
            return;
        }

        // `Widget` does not declare `handleKey`; only some concrete widgets implement it.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const focusable = this.content as any;
        if (typeof focusable.handleKey === 'function') {
            focusable.handleKey(event);
        }
    }

    private getBorderChars() {
        if (caps.unicode) {
            return {
                topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘',
                top: '─', bottom: '─', left: '│', right: '│'
            };
        }
        return {
            topLeft: '+', topRight: '+', bottomLeft: '+', bottomRight: '+',
            top: '-', bottom: '-', left: '|', right: '|'
        };
    }

    protected _renderSelf(screen: Screen): void {
        if (!this._isOpen) return;

        // Use the explicit anchor if provided, otherwise fallback to the rect's origin
        const anchorX = this.opts.anchor?.x ?? this._rect.x;
        const anchorY = this.opts.anchor?.y ?? this._rect.y;
        
        const contentRect = this.content.rect;
        const width = Math.min(Math.max(10, contentRect.width + 2), screen.cols);
        const height = Math.min(Math.max(3, contentRect.height + 2), screen.rows);

        let px = anchorX;
        let py = anchorY;

        switch (this.opts.placement) {
            case 'top': py = anchorY - height; break;
            case 'bottom': py = anchorY + 1; break;
            case 'left': px = anchorX - width; break;
            case 'right': px = anchorX + 1; break;
        }

        px = Math.min(Math.max(0, px), Math.max(0, screen.cols - width));
        py = Math.min(Math.max(0, py), Math.max(0, screen.rows - height));

        const attrs = styleToCellAttrs(this.style);
        const bAttrs = { ...attrs, fg: this.opts.borderColor || attrs.fg };
        const border = this.getBorderChars();

        // ── 1. Draw Sides & Clear Background ──
        for (let r = 1; r < height - 1; r++) {
            screen.writeString(px, py + r, border.left, bAttrs);
            // This space clears whatever was drawn beneath it on the base layer
            screen.writeString(px + 1, py + r, ' '.repeat(Math.max(0, width - 2)), attrs);
            screen.writeString(px + width - 1, py + r, border.right, bAttrs);
        }

        // ── 2. Top Border with Title ──
        const innerWidth = Math.max(0, width - 2);
        const titleStr = this.opts.title ? truncate(` ${this.opts.title} `, innerWidth, '') : '';
        const fill = Math.max(0, innerWidth - stringWidth(titleStr));
        const leftFill = Math.floor(fill / 2);
        const rightFill = fill - leftFill;

        screen.writeString(
            px, py,
            border.topLeft + border.top.repeat(leftFill) + titleStr + border.top.repeat(rightFill) + border.topRight,
            bAttrs
        );

        // ── 3. Bottom Border ──
        if (height >= 2) {
            screen.writeString(
                px, py + height - 1,
                border.bottomLeft + border.bottom.repeat(innerWidth) + border.bottomRight,
                bAttrs
            );
        }

        // ── 4. Render Child Content ──
        const contentX = px + 1;
        const contentY = py + 1;
        const contentW = innerWidth;
        const contentH = Math.max(0, height - 2);

        if (contentW > 0 && contentH > 0) {
            const originalRect = { ...this.content.rect };
            
            this.content.updateRect({
                x: contentX, y: contentY, width: contentW, height: contentH
            });

            screen.pushClip({ x: contentX, y: contentY, width: contentW, height: contentH });
            try {
                this.content.render(screen);
            } finally {
                screen.popClip();
                this.content.updateRect(originalRect);
            }
        }
    }
}
