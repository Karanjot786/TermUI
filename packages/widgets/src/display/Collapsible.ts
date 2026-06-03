// ─────────────────────────────────────────────────────
// @termuijs/widgets — Collapsible widget
//
// A toggleable section with a clickable title bar and
// a hidden or visible body. Press Enter or Space to toggle.
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type KeyEvent,
    styleToCellAttrs,
    truncate,
    caps,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

export interface CollapsibleOptions {
    /** Start open. Default: false */
    open?: boolean;
    /** Expand indicator char. Default: '▶' (or '>' in ASCII) */
    expandChar?: string;
    /** Collapse indicator char. Default: '▼' (or 'v' in ASCII) */
    collapseChar?: string;
    /** Callback when toggled */
    onToggle?: (open: boolean) => void;
}

/**
 * Collapsible — a toggleable section with title and body.
 *
 * Renders:
 * - Row 0: [indicator] [title]
 * - Rows 1+: body lines (if open)
 *
 * Press Enter or Space to toggle open/closed state.
 */
export class Collapsible extends Widget {
    private _title: string;
    private _body: string;
    private _open: boolean;
    private _expandChar: string;
    private _collapseChar: string;
    private _onToggle?: (open: boolean) => void;
    focusable = true;

    constructor(
        title: string,
        body: string,
        style: Partial<Style> = {},
        opts: CollapsibleOptions = {},
    ) {
        const open = opts.open ?? false;
        const bodyLines = opts.open ? body.split('\n').length : 0;
        super({ ...style, height: 1 + bodyLines });
        this._open = open;

        this._title = title;
        this._body = body;
        this._open = opts.open ?? false;
        this._expandChar = opts.expandChar ?? (caps.unicode ? '▶' : '>');
        this._collapseChar = opts.collapseChar ?? (caps.unicode ? '▼' : 'v');
        this._onToggle = opts.onToggle;
    }

    /** Update the title and re-render. */
    setTitle(title: string): void {
        this._title = title;
        this.markDirty();
    }

    /** Update the body and re-render. */
    setBody(body: string): void {
        this._body = body;
        const bodyLines = this._open ? body.split('\n').length : 0;
        this.style.height = 1 + bodyLines;
        this.markDirty();
    }

    /** Toggle between open and closed. Fires onToggle callback. */
    toggle(): void {
        this._open = !this._open;
        const bodyLines = this._open ? this._body.split('\n').length : 0;
        this.style.height = 1 + bodyLines;
        this._onToggle?.(this._open);
        this.markDirty();
    }

    /** Check if currently open. */
    isOpen(): boolean {
        return this._open;
    }

    /**
     * Handle key events.
     */
    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'enter':
            case 'space':
                this.toggle();
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);

        // Row 0: indicator + title
        const indicator = this._open ? this._collapseChar : this._expandChar;
        const titleLine = indicator + ' ' + this._title;
        screen.writeString(x, y, truncate(titleLine, width), attrs);

        // Rows 1+: body (if open)
        if (this._open) {
            const bodyLines = this._body.split('\n');
            for (let i = 0; i < bodyLines.length && i < height - 1; i++) {
                screen.writeString(x, y + 1 + i, truncate(bodyLines[i], width), attrs);
            }
        }
    }
}
