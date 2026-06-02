// ─────────────────────────────────────────────────────
// @termuijs/ui — Drawer widget
//
// A side panel that slides in from an edge of the terminal.
// It overlays existing content when open and dims the rest
// of the screen behind it.
//
// Keyboard behaviour:
//   Escape   Fire onClose
//   Tab      Cycle focus forward through focusable children
//   Shift+Tab  Cycle focus backward through focusable children
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import {
    type Style,
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    getBorderChars,
    caps,
} from '@termuijs/core';

// ── Types ────────────────────────────────────────────

/** The edge from which the drawer slides into view. */
export type DrawerPosition = 'left' | 'right' | 'top' | 'bottom';

export interface DrawerOptions {
    /** Edge the drawer appears from. */
    position: DrawerPosition;
    /**
     * Panel width in columns.
     * Applies to 'left' and 'right' positions only.
     * Defaults to 30.
     */
    width?: number;
    /**
     * Panel height in rows.
     * Applies to 'top' and 'bottom' positions only.
     * Defaults to 10.
     */
    height?: number;
    /** Optional title shown in the drawer's top border. */
    title?: string;
    /** Called when the user presses Escape or explicitly closes the drawer. */
    onClose: () => void;
    /** Character used for the dimmed backdrop. Defaults to '░' (unicode) or ' '. */
    backdropChar?: string;
    /** Border colour. Defaults to cyan. */
    borderColor?: Style['fg'];
}

// ── Widget ───────────────────────────────────────────

/**
 * Drawer — a side panel that slides in from any edge.
 *
 * Usage:
 * ```ts
 * const drawer = new Drawer({
 *   position: 'right',
 *   width: 30,
 *   title: 'Settings',
 *   onClose: () => closeDrawer(),
 * });
 * drawer.addChild(new Form({ fields: settingsFields }));
 * drawer.open();
 * ```
 *
 * Wire keyboard events via `handleKey(event)`.
 */
export class Drawer extends Widget {
    private _position: DrawerPosition;
    private _panelWidth: number;
    private _panelHeight: number;
    private _title: string;
    private _onClose: () => void;
    private _backdropChar: string;
    private _borderColor: Style['fg'];
    private _open = false;

    /**
     * Index into the flat list of focusable children that currently
     * holds the "focused" slot inside the focus trap.
     * Starts at -1 so the first Tab press naturally lands on index 0.
     */
    private _focusIndex = -1;

    focusable = true;

    constructor(options: DrawerOptions) {
        super(mergeStyles(defaultStyle(), {}));
        this._position = options.position;
        this._panelWidth = options.width ?? 30;
        this._panelHeight = options.height ?? 10;
        this._title = options.title ?? '';
        this._onClose = options.onClose;
        this._backdropChar = options.backdropChar ?? (caps.unicode ? '░' : ' ');
        this._borderColor = options.borderColor ?? { type: 'named', name: 'cyan' };
    }

    // ── Public API ───────────────────────────────────

    /** Whether the drawer is currently open. */
    get isOpen(): boolean {
        return this._open;
    }

    /** Open the drawer and mark dirty. */
    open(): void {
        this._open = true;
        this._focusIndex = -1;
        this.markDirty();
    }

    /** Close the drawer and mark dirty. */
    close(): void {
        this._open = false;
        this.markDirty();
    }

    /** Toggle open/close state. */
    toggle(): void {
        this._open ? this.close() : this.open();
    }

    /**
     * Handle keyboard input.
     *
     * | Key          | Action                          |
     * |--------------|---------------------------------|
     * | `Escape`     | Fire `onClose`                  |
     * | `Tab`        | Move focus to next child        |
     * | `Shift+Tab`  | Move focus to previous child    |
     */
    handleKey(event: KeyEvent): void {
        if (!this._open) return;

        switch (event.key) {
            case 'escape':
                this._onClose();
                break;
            case 'tab':
                if (event.shift) {
                    this._focusPrev();
                } else {
                    this._focusNext();
                }
                break;
        }
    }

    // ── Focus trap ───────────────────────────────────

    /**
     * Return a flat list of all focusable descendants in tree order.
     * Used to implement the focus trap.
     */
    private _focusableChildren(): Widget[] {
        const result: Widget[] = [];
        const collect = (widget: Widget): void => {
            for (const child of widget.children) {
                if (child.focusable) result.push(child);
                collect(child);
            }
        };
        collect(this);
        return result;
    }

    private _focusNext(): void {
        const focusable = this._focusableChildren();
        if (focusable.length === 0) return;
        // _focusIndex starts at -1 so the first +1 lands on index 0.
        this._focusIndex = (this._focusIndex + 1) % focusable.length;
        this._applyFocus(focusable);
        this.markDirty();
    }

    private _focusPrev(): void {
        const focusable = this._focusableChildren();
        if (focusable.length === 0) return;
        // When _focusIndex is -1 (no prior Tab), wrap to the last child.
        const base = this._focusIndex < 0 ? 0 : this._focusIndex;
        this._focusIndex = (base - 1 + focusable.length) % focusable.length;
        this._applyFocus(focusable);
        this.markDirty();
    }

    private _applyFocus(focusable: Widget[]): void {
        for (let i = 0; i < focusable.length; i++) {
            focusable[i].isFocused = i === this._focusIndex;
        }
    }

    // ── Geometry helpers ─────────────────────────────

    /**
     * Compute the panel rect (position + dimensions) relative to the
     * full widget rect.
     */
    private _panelRect(
        x: number,
        y: number,
        totalWidth: number,
        totalHeight: number,
    ): { px: number; py: number; pw: number; ph: number } {
        const pw =
            this._position === 'left' || this._position === 'right'
                ? Math.min(this._panelWidth, totalWidth)
                : totalWidth;

        const ph =
            this._position === 'top' || this._position === 'bottom'
                ? Math.min(this._panelHeight, totalHeight)
                : totalHeight;

        let px: number;
        let py: number;

        switch (this._position) {
            case 'left':
                px = x;
                py = y;
                break;
            case 'right':
                px = x + totalWidth - pw;
                py = y;
                break;
            case 'top':
                px = x;
                py = y;
                break;
            case 'bottom':
                px = x;
                py = y + totalHeight - ph;
                break;
        }

        return { px, py, pw, ph };
    }

    // ── Rendering ────────────────────────────────────

    protected _renderSelf(screen: Screen): void {
        if (!this._open) return;

        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);

        // ── 1. Backdrop (dim the whole area) ─────────
        for (let r = 0; r < height; r++) {
            screen.writeString(
                x,
                y + r,
                this._backdropChar.repeat(width),
                { ...attrs, dim: true },
            );
        }

        // ── 2. Panel ─────────────────────────────────
        const { px, py, pw, ph } = this._panelRect(x, y, width, height);

        const border = getBorderChars('single');
        if (!border) return;

        const bAttrs = { ...attrs, fg: this._borderColor };

        // Clear panel interior (overwrite backdrop characters)
        for (let r = 1; r < ph - 1; r++) {
            screen.writeString(px, py + r, border.left, bAttrs);
            screen.writeString(px + 1, py + r, ' '.repeat(Math.max(0, pw - 2)), attrs);
            screen.writeString(px + pw - 1, py + r, border.right, bAttrs);
        }

        // ── Top border with optional title ────────────
        const titleStr = this._title ? ` ${this._title} ` : '';
        const innerWidth = Math.max(0, pw - 2);
        const fill = Math.max(0, innerWidth - titleStr.length);
        const leftFill = Math.floor(fill / 2);
        const rightFill = fill - leftFill;

        screen.writeString(
            px,
            py,
            border.topLeft
            + border.top.repeat(leftFill)
            + titleStr
            + border.top.repeat(rightFill)
            + border.topRight,
            bAttrs,
        );

        // ── Bottom border ─────────────────────────────
        if (ph >= 2) {
            screen.writeString(
                px,
                py + ph - 1,
                border.bottomLeft + border.bottom.repeat(Math.max(0, pw - 2)) + border.bottomRight,
                bAttrs,
            );
        }

        // ── 3. Render children inside the content area ──
        const contentX = px + 1;
        const contentY = py + 1;
        const contentW = Math.max(0, pw - 2);
        const contentH = Math.max(0, ph - 2);

        if (contentW > 0 && contentH > 0) {
            for (const child of this._children) {
                const originalRect = { ...child.rect };
                child.updateRect({
                    x: contentX,
                    y: contentY,
                    width: contentW,
                    height: contentH,
                });
                screen.pushClip({ x: contentX, y: contentY, width: contentW, height: contentH });
                try {
                    child.render(screen);
                } finally {
                    screen.popClip();
                    child.updateRect(originalRect);
                }
            }
        }
    }
}
